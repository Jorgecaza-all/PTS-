import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";
import { isPermitCurrentlyValid } from "@/lib/permits";

export const dynamic = "force-dynamic";

// POST /api/enforcement/permits/:id/scan — GATE_ACCESS entry/exit scanning (spec 4.5):
// one scan in, one scan out, nothing more (no re-entry). OPEN_LOT permits aren't
// scanned at all — they're checked by plate presence via /api/enforcement/search.
// body: { direction: "in" | "out" }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const { direction } = await req.json();
  if (direction !== "in" && direction !== "out") {
    return NextResponse.json({ error: "direction must be 'in' or 'out'" }, { status: 400 });
  }

  const permit = await prisma.permit.findUnique({
    where: { id: params.id },
    include: { event: true, lot: true },
  });
  if (!permit) {
    return NextResponse.json({ error: "No permit found for this code" }, { status: 404 });
  }
  if (permit.lot.accessType !== "GATE_ACCESS") {
    return NextResponse.json({ error: "Entry/exit scanning only applies to gate-access lots" }, { status: 400 });
  }

  if (direction === "in") {
    if (!isPermitCurrentlyValid(permit)) {
      return NextResponse.json({ error: "Permit is not currently valid" }, { status: 400 });
    }
    if (permit.enteredAt) {
      return NextResponse.json(
        { error: `Already scanned in at ${permit.enteredAt.toLocaleString()}` },
        { status: 400 }
      );
    }
  } else {
    if (!permit.enteredAt) {
      return NextResponse.json({ error: "Cannot scan out — no entry recorded" }, { status: 400 });
    }
    if (permit.exitedAt) {
      return NextResponse.json(
        { error: `Already scanned out at ${permit.exitedAt.toLocaleString()}` },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.permit.update({
    where: { id: params.id },
    data: direction === "in" ? { enteredAt: new Date() } : { exitedAt: new Date() },
    include: { event: true, lot: true },
  });

  return NextResponse.json({ valid: isPermitCurrentlyValid(updated), permit: updated });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";
import { isPermitCurrentlyValid } from "@/lib/permits";

export const dynamic = "force-dynamic";

// GET /api/enforcement/search?plate=&lotId= — manual plate lookup for OPEN_LOT
// enforcement (spec 4.5): "is there an active Permit for this plate at this lot
// right now?" Same permits table and validity check as the QR/permit-id path.
export async function GET(req: Request) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const plate = searchParams.get("plate");
  const lotId = searchParams.get("lotId");
  if (!plate || !lotId) {
    return NextResponse.json({ error: "plate and lotId are required" }, { status: 400 });
  }

  const permits = await prisma.permit.findMany({
    where: { licensePlate: plate.toUpperCase(), lotId },
    include: { event: true, lot: true },
    orderBy: { createdAt: "desc" },
  });

  const results = permits.map((p) => ({ ...p, valid: isPermitCurrentlyValid(p) }));
  return NextResponse.json({ valid: results.some((p) => p.valid), permits: results });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/events — all events (not just upcoming) with their lots, for the
// staff admin tool's event pickers (issuing a permit, searching by event).
export async function GET(req: Request) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    include: { lots: { include: { lot: true } } },
  });

  return NextResponse.json(
    events.map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      price: e.price,
      lots: e.lots.map((el) => ({ id: el.lot.id, name: el.lot.name, accessType: el.lot.accessType })),
    }))
  );
}

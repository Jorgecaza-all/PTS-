import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/stats — permit counts by type per event and per event lot (with
// capacity). Uses groupBy (full-table aggregation), not the capped /api/admin/permits search.
// Every Permit row counts as one occupied space (demo assumption).
export async function GET(req: Request) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const [rows, real, events] = await Promise.all([
    prisma.permit.groupBy({ by: ["eventId", "lotId", "permitType"], _count: true }),
    prisma.permit.groupBy({ by: ["eventId"], where: { livemode: true }, _count: true }),
    prisma.event.findMany({
      orderBy: { startDate: "desc" },
      include: { lots: { include: { lot: true }, orderBy: { lot: { name: "asc" } } } },
    }),
  ]);
  const liveBy = new Map(real.map((r) => [r.eventId, r._count]));
  const n = (eventId: string, lotId: string, type: string) =>
    rows.find((r) => r.eventId === eventId && r.lotId === lotId && r.permitType === type)?._count ?? 0;

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      name: e.name,
      endedAt: e.endedAt,
      startDate: e.startDate,
      endDate: e.endDate,
      price: e.price,
      livePermits: liveBy.get(e.id) ?? 0,
      lots: e.lots.map((el) => ({
        lotId: el.lotId,
        name: el.lot.name,
        capacity: el.capacity,
        purchased: n(e.id, el.lotId, "purchased"),
        dv_exempt: n(e.id, el.lotId, "dv_exempt"),
        staff_issued: n(e.id, el.lotId, "staff_issued"),
      })),
    })),
  });
}

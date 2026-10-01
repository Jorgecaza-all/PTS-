import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/stats — permit counts by type, overall and per event. Uses groupBy
// (full-table aggregation), not the capped search results in /api/admin/permits.
export async function GET(req: Request) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const [overall, byEventRaw, events] = await Promise.all([
    prisma.permit.groupBy({ by: ["permitType"], _count: true }),
    prisma.permit.groupBy({ by: ["eventId", "permitType"], _count: true }),
    prisma.event.findMany({ select: { id: true, name: true } }),
  ]);

  const countsFor = (rows: { permitType: string; _count: number }[]) => {
    const c = { total: 0, purchased: 0, dv_exempt: 0, staff_issued: 0 };
    for (const r of rows) {
      c.total += r._count;
      (c as any)[r.permitType] += r._count;
    }
    return c;
  };

  const eventName = new Map(events.map((e) => [e.id, e.name]));
  const byEventId = new Map<string, { permitType: string; _count: number }[]>();
  for (const r of byEventRaw) {
    if (!byEventId.has(r.eventId)) byEventId.set(r.eventId, []);
    byEventId.get(r.eventId)!.push(r);
  }

  return NextResponse.json({
    overall: countsFor(overall),
    byEvent: [...byEventId.entries()].map(([eventId, rows]) => ({
      eventId,
      eventName: eventName.get(eventId) ?? "(deleted event)",
      ...countsFor(rows),
    })),
  });
}

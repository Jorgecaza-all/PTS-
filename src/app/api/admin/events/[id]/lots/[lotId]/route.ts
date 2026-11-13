import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";

// PATCH /api/admin/events/:id/lots/:lotId { capacity } — scoped to one event+lot row.
export async function PATCH(req: Request, { params }: { params: { id: string; lotId: string } }) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const { capacity } = await req.json().catch(() => ({}));
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1_000_000) {
    return NextResponse.json({ error: "capacity must be a positive whole number" }, { status: 400 });
  }
  const eventId_lotId = { eventId: params.id, lotId: params.lotId };
  if (!(await prisma.eventLot.findUnique({ where: { eventId_lotId } }))) {
    return NextResponse.json({ error: "Event lot not found" }, { status: 404 });
  }
  await prisma.eventLot.update({ where: { eventId_lotId }, data: { capacity } });
  return NextResponse.json({ capacity });
}

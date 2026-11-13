import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";

// POST /api/admin/events/:id/archive — the safe alternative to reset/delete for events
// with real payments: ends the event (if not already) and flags it archived. Nothing is erased.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const now = new Date();
  await prisma.event.update({
    where: { id: params.id },
    data: { endedAt: event.endedAt ?? now, archivedAt: event.archivedAt ?? now },
  });
  return NextResponse.json({ id: event.id });
}

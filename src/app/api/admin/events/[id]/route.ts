import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";

// DELETE /api/admin/events/:id — permanently deletes this event's demo/sandbox data.
// Sandbox Stripe payments (livemode=false) are deletable; live-mode permits never are.
// If any exist, only the sandbox/demo records go and the event stays (200, liveKept > 0).
// The event row is locked FOR UPDATE first: a concurrent webhook's permit insert needs a
// KEY SHARE lock on it, so each insert either lands before the count (and is protected
// if live) or waits and then fails its FK -> webhook returns 500 for live -> Stripe retries.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const id = params.id;
  const where = { eventId: id };
  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${id} FOR UPDATE`;
    if (!Array.isArray(locked) || !locked.length) return null;
    const live = { ...where, livemode: true };
    const liveKept = await tx.permit.count({ where: live });
    const demo = { eventId: id, livemode: false };
    await tx.refundRequest.deleteMany({ where: { permit: demo } });
    await tx.permit.deleteMany({ where: demo });
    if (!liveKept) {
      await tx.eventLot.deleteMany({ where });
      await tx.event.delete({ where: { id } });
    }
    return { deleted: !liveKept, liveKept };
  });
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Event not found" }, { status: 404 });
}

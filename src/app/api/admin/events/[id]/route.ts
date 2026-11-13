import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";

// DELETE /api/admin/events/:id — removes a demo event and its demo permits. Events with
// real payments get 409 (archive instead). Same check-then-delete minimal choice as reset.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const where = { eventId: params.id };
  if (!(await prisma.event.findUnique({ where: { id: params.id } }))) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (await prisma.permit.count({ where: { ...where, paymentRef: { not: null } } })) {
    return NextResponse.json({ error: "Event has real payments; archive it instead" }, { status: 409 });
  }
  await prisma.$transaction([
    prisma.refundRequest.deleteMany({ where: { permit: where } }),
    prisma.permit.deleteMany({ where }),
    prisma.eventLot.deleteMany({ where }),
    prisma.event.delete({ where: { id: params.id } }),
  ]);
  return NextResponse.json({ ok: true });
}

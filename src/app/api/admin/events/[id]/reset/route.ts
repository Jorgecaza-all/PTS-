import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";

// POST /api/admin/events/:id/reset — clears this event's demo permits only. Real
// payments (Permit.paymentRef set by the Stripe webhook) are never erased: such events get 409.
// Setup, capacities, price and ended/archived status are untouched.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const where = { eventId: params.id };
  if (!(await prisma.event.findUnique({ where: { id: params.id } }))) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (await prisma.permit.count({ where: { ...where, paymentRef: { not: null } } })) {
    return NextResponse.json({ error: "Event has real payments; archive it instead" }, { status: 409 });
  }
  // Minimal choice: check-then-delete, not serializable; demo events aren't taking live payments.
  await prisma.$transaction([
    prisma.refundRequest.deleteMany({ where: { permit: where } }),
    prisma.permit.deleteMany({ where }),
  ]);
  return NextResponse.json({ ok: true });
}

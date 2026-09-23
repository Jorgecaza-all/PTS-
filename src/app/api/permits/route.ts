import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/permits
// Creates a permit record. Used by all three paths (purchased, staff_issued, dv_exempt) —
// this is the single write path that keeps everything in one table, which is the whole point.
// body: {
//   licensePlate, eventId, lotId, nameOnPermit, permitType,
//   paymentRef?  (Stripe PaymentIntent id — required if permitType = 'purchased')
//   dvPlacardNumber? (required if permitType = 'dv_exempt')
// }
export async function POST(req: Request) {
  const body = await req.json();
  const { licensePlate, eventId, lotId, nameOnPermit, permitType, paymentRef, dvPlacardNumber } = body;

  if (permitType === "purchased" && !paymentRef) {
    return NextResponse.json({ error: "paymentRef required for purchased permits" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const permit = await prisma.permit.create({
    data: {
      licensePlate: licensePlate.toUpperCase(),
      eventId,
      lotId,
      nameOnPermit,
      permitType,
      paymentRef: paymentRef ?? null,
      dvPlacardNumber: dvPlacardNumber ?? null,
      validUntil: event.date, // TODO: confirm exact expiry rule with UT Parking (event end time + buffer?)
    },
  });

  return NextResponse.json(permit);
}

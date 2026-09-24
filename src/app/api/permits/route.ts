import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// POST /api/permits
// Public write path for the two guest-facing permit types: purchased and dv_exempt.
// staff_issued permits can only be created by staff, via /api/admin/permits — this
// route rejects that type outright so an anonymous request can't grant itself a comp.
// body: {
//   licensePlate, eventId, lotId, nameOnPermit, permitType,
//   paymentRef?  (Stripe PaymentIntent id — required if permitType = 'purchased')
//   dvPlacardNumber? (required if permitType = 'dv_exempt')
// }
export async function POST(req: Request) {
  const body = await req.json();
  const { licensePlate, eventId, lotId, nameOnPermit, permitType, paymentRef, dvPlacardNumber } = body;

  if (permitType !== "purchased" && permitType !== "dv_exempt") {
    return NextResponse.json({ error: "Invalid permitType" }, { status: 400 });
  }

  if (permitType === "purchased" && !paymentRef) {
    return NextResponse.json({ error: "paymentRef required for purchased permits" }, { status: 400 });
  }
  if (permitType === "dv_exempt" && !dvPlacardNumber?.trim()) {
    return NextResponse.json({ error: "dvPlacardNumber required for DV permits" }, { status: 400 });
  }
  if (!licensePlate?.trim() || !nameOnPermit?.trim() || !eventId || !lotId) {
    return NextResponse.json({ error: "licensePlate, nameOnPermit, eventId, and lotId are required" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const eventLot = await prisma.eventLot.findUnique({
    where: { eventId_lotId: { eventId, lotId } },
  });
  if (!eventLot) {
    return NextResponse.json({ error: "Selected lot is not valid for this event" }, { status: 400 });
  }

  if (permitType === "purchased") {
    // Verify the payment actually succeeded and was for this event, server-side —
    // never trust a client-supplied paymentRef on its own, or anyone could POST a
    // fabricated id and get a free permit.
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentRef);
    } catch {
      return NextResponse.json({ error: "Invalid paymentRef" }, { status: 400 });
    }
    if (paymentIntent.status !== "succeeded" || paymentIntent.metadata?.eventId !== eventId) {
      return NextResponse.json({ error: "Payment not verified for this event" }, { status: 400 });
    }

    const alreadyUsed = await prisma.permit.findFirst({ where: { paymentRef } });
    if (alreadyUsed) {
      return NextResponse.json({ error: "This payment has already been used for a permit" }, { status: 400 });
    }
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

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { permitWindowForEvent } from "@/lib/permits";

// POST /api/stripe/webhook — the ONLY place a "purchased" permit gets created.
// Signature-verified, so a forged request (or a browser redirect alone) can never
// mint a permit. Idempotent against Stripe's at-least-once delivery: paymentRef is
// unique on Permit, and we check for an existing one first — either way a retried
// event is a safe no-op, never a duplicate permit.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text(); // raw body required for signature verification

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return NextResponse.json({ received: true });

  const paymentRef = session.payment_intent as string;
  const { eventId, lotId, licensePlate, nameOnPermit } = session.metadata ?? {};
  if (!eventId || !lotId || !licensePlate || !nameOnPermit) return NextResponse.json({ received: true });

  if (await prisma.permit.findFirst({ where: { paymentRef } })) {
    return NextResponse.json({ received: true }); // already issued by an earlier delivery of this event
  }

  const parkingEvent = await prisma.event.findUnique({ where: { id: eventId } });
  if (!parkingEvent) return NextResponse.json({ received: true }); // nothing sane to do — event gone

  const { validFrom, validUntil } = permitWindowForEvent(parkingEvent);

  try {
    await prisma.permit.create({
      data: {
        licensePlate,
        eventId,
        lotId,
        nameOnPermit,
        permitType: "purchased",
        paymentRef,
        validFrom,
        validUntil,
      },
    });
  } catch (e: any) {
    if (e.code !== "P2002") throw e; // unique paymentRef race with a concurrent retry — permit already exists, fine
  }

  return NextResponse.json({ received: true });
}

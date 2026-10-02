import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// POST /api/stripe/create-checkout-session
// body: { eventId, lotId, licensePlate, nameOnPermit }
// Stripe-hosted Checkout: no card data ever touches our server, and card/Apple Pay/
// Google Pay/Link show up automatically based on the Dashboard's enabled payment
// methods — omitting payment_method_types is the documented way to get that, so
// there's nothing to configure here. Price always comes from `event.price` (DB), never
// the client. Checkout metadata carries what the webhook needs to create the permit —
// no separate "pending permit" table required.
export async function POST(req: Request) {
  const { eventId, lotId, licensePlate, nameOnPermit } = await req.json();
  if (!eventId || !lotId || !licensePlate?.trim() || !nameOnPermit?.trim()) {
    return NextResponse.json({ error: "eventId, lotId, licensePlate, and nameOnPermit are required" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.endedAt) {
    return NextResponse.json({ error: "This event has ended and is no longer accepting payments" }, { status: 410 });
  }

  const eventLot = await prisma.eventLot.findUnique({
    where: { eventId_lotId: { eventId, lotId } },
    include: { lot: true },
  });
  if (!eventLot) return NextResponse.json({ error: "Selected lot is not valid for this event" }, { status: 400 });

  const origin = new URL(req.url).origin;
  const plate = licensePlate.toUpperCase();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: event.price,
          product_data: { name: `${event.name} — ${eventLot.lot.name}` },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/confirmation/pending?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/events/${eventId}?plate=${encodeURIComponent(plate)}`,
    metadata: { eventId, lotId, licensePlate: plate, nameOnPermit },
  });

  return NextResponse.json({ url: session.url });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// POST /api/stripe/create-checkout-session
// body: { eventId, lotId, licensePlate }
// Embedded Checkout (ui_mode "embedded"): rendered by Stripe inside our page, so no card
// data touches our server; card/Apple Pay/Google Pay/Link follow the Dashboard's enabled
// payment methods (payment_method_types omitted on purpose). Price always comes from `event.price` (DB), never
// the client. Checkout metadata carries what the webhook needs to create the permit —
// no separate "pending permit" table required.
export async function POST(req: Request) {
  const { eventId, lotId, licensePlate } = await req.json();
  if (!eventId || !lotId || !licensePlate?.trim()) {
    return NextResponse.json({ error: "eventId, lotId, and licensePlate are required" }, { status: 400 });
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
    ui_mode: "embedded",
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
    return_url: `${origin}/confirmation/pending?session_id={CHECKOUT_SESSION_ID}`,
    metadata: { eventId, lotId, licensePlate: plate },
  });

  return NextResponse.json({ clientSecret: session.client_secret });
}

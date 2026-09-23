import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// POST /api/stripe/create-payment-intent
// body: { eventId: string }
// Creates a Stripe PaymentIntent for the event's flat price.
// automatic_payment_methods lets Stripe surface Apple Pay / Google Pay automatically
// on supported devices/browsers via the Payment Request Button — no extra config needed
// beyond enabling those wallets in the Stripe Dashboard.
export async function POST(req: Request) {
  const { eventId } = await req.json();

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: event.price, // cents
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: { eventId },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/stripe/session-status?session_id=... — polled by /confirmation/pending to
// bridge the gap between the Checkout redirect and the webhook actually landing.
// Never issues a permit itself; only reports whether the webhook already has.
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "session_id is required" }, { status: 400 });

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === "paid" && session.payment_intent) {
    const permit = await prisma.permit.findFirst({ where: { paymentRef: session.payment_intent as string } });
    if (permit) return NextResponse.json({ permitId: permit.id });
    return NextResponse.json({ pending: true }); // paid, webhook hasn't landed yet
  }

  if (session.status === "expired") return NextResponse.json({ failed: true });
  return NextResponse.json({ pending: true });
}

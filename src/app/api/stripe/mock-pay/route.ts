import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/stripe/mock-pay — DEMO ONLY. Lets you click through the purchase flow
// to the confirmation screen without real Stripe keys/network access, by minting a
// fake paymentRef that POST /api/permits recognizes (see the MOCK_PAYMENTS branch
// there). Only responds when NEXT_PUBLIC_MOCK_PAYMENTS is set — off by default, so
// this can't be used to bypass payment once real Stripe keys are configured.
// body: { eventId }
export async function POST(req: Request) {
  if (process.env.NEXT_PUBLIC_MOCK_PAYMENTS !== "true") {
    return NextResponse.json({ error: "Mock payments are disabled" }, { status: 404 });
  }

  const { eventId } = await req.json();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const paymentRef = `mock_${eventId}_${randomBytes(8).toString("hex")}`;
  return NextResponse.json({ paymentRef });
}

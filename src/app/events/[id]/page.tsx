"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

// DEMO ONLY — lets the purchase flow be clicked through to confirmation without real
// Stripe keys/network access. See /api/stripe/mock-pay and the isMockPayment branch
// in /api/permits. Off by default; never enable this alongside real Stripe keys.
const MOCK_PAYMENTS = process.env.NEXT_PUBLIC_MOCK_PAYMENTS === "true";

type EventLot = { id: string; name: string; accessType: "OPEN_LOT" | "GATE_ACCESS" };
type EventDetail = { id: string; name: string; price: number; lots: EventLot[] };

// Screen 3: "Parking for [Event]" — Name + payment, matching the wireframe.
// The Stripe PaymentElement automatically shows Apple Pay / Google Pay buttons on
// supported devices ABOVE the card fields — no separate wiring needed for wallets,
// as long as they're enabled in the Stripe Dashboard and the domain is verified with Apple/Google.
export default function EventDetailPage({ params }: { params: { id: string } }) {
  const [name, setName] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const plate = useSearchParams().get("plate") ?? "";

  useEffect(() => {
    if (!MOCK_PAYMENTS) {
      fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: params.id }),
      })
        .then((r) => r.json())
        .then((data) => setClientSecret(data.clientSecret));
    }

    fetch(`/api/events/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data);
        // Skip the picker entirely when there's only one lot — every extra tap
        // costs us with the older, less tech-savvy users this app is built for.
        if (data.lots?.length === 1) setSelectedLotId(data.lots[0].id);
      });
  }, [params.id]);

  const lots = event?.lots ?? [];

  return (
    <div>
      <h2 className="text-xl font-semibold text-center mb-6">Parking for this Event</h2>

      <input
        className="border-2 border-gray-800 rounded-lg px-4 py-4 w-full mb-4"
        placeholder="Name of Person"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {lots.length > 1 && (
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">Choose a lot or garage</p>
          <div className="flex flex-col gap-2">
            {lots.map((lot) => (
              <button
                key={lot.id}
                type="button"
                onClick={() => setSelectedLotId(lot.id)}
                className={`text-left border-2 rounded-lg px-4 py-3 ${
                  selectedLotId === lot.id
                    ? "border-sky-400 bg-sky-50"
                    : "border-gray-300"
                }`}
              >
                {lot.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedLotId && MOCK_PAYMENTS && event && (
        <MockPaymentForm eventId={params.id} plate={plate} name={name} lotId={selectedLotId} price={event.price} />
      )}

      {selectedLotId && !MOCK_PAYMENTS && clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm eventId={params.id} plate={plate} name={name} lotId={selectedLotId} />
        </Elements>
      )}

      <p className="text-sm text-center mt-6">
        <a href={`/events/${params.id}/dv?plate=${encodeURIComponent(plate)}`} className="underline">
          I have a DV placard
        </a>
      </p>
    </div>
  );
}

// DEMO ONLY — see MOCK_PAYMENTS above.
function MockPaymentForm({
  eventId,
  plate,
  name,
  lotId,
  price,
}: {
  eventId: string;
  plate: string;
  name: string;
  lotId: string;
  price: number;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handlePay = async () => {
    if (!name.trim() || !plate) return;
    setSubmitting(true);

    const mockRes = await fetch("/api/stripe/mock-pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    const { paymentRef } = await mockRes.json();

    const res = await fetch("/api/permits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licensePlate: plate,
        eventId,
        lotId,
        nameOnPermit: name,
        permitType: "purchased",
        paymentRef,
      }),
    });
    const permit = await res.json();
    router.push(`/confirmation/${permit.id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-center">
        Demo mode — no real payment is processed.
      </p>
      <button
        onClick={handlePay}
        disabled={submitting || !name.trim()}
        className="bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-full py-4"
      >
        {submitting ? "Processing..." : `Pay $${(price / 100).toFixed(2)}`}
      </button>
    </div>
  );
}

function PaymentForm({
  eventId,
  plate,
  name,
  lotId,
}: {
  eventId: string;
  plate: string;
  name: string;
  lotId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements || !name.trim() || !plate) return;
    setSubmitting(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      alert(error.message);
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/permits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licensePlate: plate,
        eventId,
        lotId,
        nameOnPermit: name,
        permitType: "purchased",
        paymentRef: paymentIntent?.id,
      }),
    });
    const permit = await res.json();
    router.push(`/confirmation/${permit.id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <PaymentElement />
      <button
        onClick={handlePay}
        disabled={submitting}
        className="bg-sky-400 hover:bg-sky-500 text-white font-semibold rounded-full py-4"
      >
        {submitting ? "Processing..." : "GO"}
      </button>
    </div>
  );
}

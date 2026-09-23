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

// Screen 3: "Parking for [Event]" — Name + payment, matching the wireframe.
// The Stripe PaymentElement automatically shows Apple Pay / Google Pay buttons on
// supported devices ABOVE the card fields — no separate wiring needed for wallets,
// as long as they're enabled in the Stripe Dashboard and the domain is verified with Apple/Google.
export default function EventDetailPage({ params }: { params: { id: string } }) {
  const [name, setName] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const plate = useSearchParams().get("plate") ?? "";

  useEffect(() => {
    fetch("/api/stripe/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: params.id }),
    })
      .then((r) => r.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, [params.id]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-center mb-6">Parking for this Event</h2>

      <input
        className="border-2 border-gray-800 rounded-lg px-4 py-4 w-full mb-4"
        placeholder="Name of Person"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm eventId={params.id} plate={plate} name={name} />
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

function PaymentForm({ eventId, plate, name }: { eventId: string; plate: string; name: string }) {
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

    // TODO: lotId should come from a lot-selection step if an event has multiple lots —
    // for now this assumes the API assigns/accepts the first available lot for the event.
    const res = await fetch("/api/permits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licensePlate: plate,
        eventId,
        lotId: "REPLACE_WITH_SELECTED_LOT_ID",
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

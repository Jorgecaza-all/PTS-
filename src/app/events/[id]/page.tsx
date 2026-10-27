"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

type EventLot = { id: string; name: string; accessType: "OPEN_LOT" | "GATE_ACCESS" };
type EventDetail = { id: string; name: string; price: number; lots: EventLot[]; endedAt: string | null };

// Screen 3: "Parking for [Event]" — lot pick + payment.
// Pay mounts Stripe Embedded Checkout on this page (card/Apple Pay/Google Pay/Link show
// up automatically); Stripe then returns to /confirmation/pending, which waits for the
// signature-verified webhook to actually create the permit — see
// /api/stripe/create-checkout-session and /api/stripe/webhook.
export default function EventDetailPage({ params }: { params: { id: string } }) {
  const checkoutEl = useRef<HTMLDivElement>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const plate = useSearchParams().get("plate") ?? "";

  useEffect(() => {
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

  const handlePay = async () => {
    if (!plate || !selectedLotId) return;
    setSubmitting(true);
    setError("");

    const fail = (msg: string) => {
      setSubmitting(false);
      setError(msg);
    };
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: params.id, lotId: selectedLotId, licensePlate: plate }),
      });
      const data = await res.json();
      if (!res.ok) return fail(data.error ?? "This event is no longer available. Please go back and pick another.");
      if (!data.clientSecret) return fail("Payment could not be started. Please try again.");
      // Must be inlined at build time: set it in Vercel BEFORE the build, then redeploy.
      const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!key) return fail("Payments are not configured (missing publishable key).");
      const stripe = await loadStripe(key);
      if (!stripe) return fail("Payment form failed to load. Please try again.");
      // Minimal: no unmount handling — a refresh just creates a fresh session; the
      // webhook's unique paymentRef keeps one payment = one permit.
      const checkout = await stripe.initEmbeddedCheckout({ clientSecret: data.clientSecret });
      checkout.mount(checkoutEl.current!);
    } catch {
      fail("Payment form failed to load. Please try again."); // no error details: could echo secrets
    }
  };

  return (
    <div>
      <a href={`/events?plate=${encodeURIComponent(plate)}`} className="text-sm underline text-gray-600">
        ← Back
      </a>
      <h2 className="text-xl font-semibold text-center mb-6">Parking for this Event</h2>

      {event?.endedAt ? (
        <p className="text-center text-red-600 font-medium">This event has ended and is no longer accepting payments.</p>
      ) : (
        <>
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
                      selectedLotId === lot.id ? "border-sky-400 bg-sky-50" : "border-gray-300"
                    }`}
                  >
                    {lot.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 text-center mb-4">{error}</p>}

          <div ref={checkoutEl} />
          {!submitting && <button
            onClick={handlePay}
            disabled={!selectedLotId}
            className="bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-full py-4 w-full"
          >
            {event ? `Pay $${(event.price / 100).toFixed(2)}` : "Pay"}
          </button>}

          <p className="text-sm text-center mt-6">
            <a href={`/events/${params.id}/dv?plate=${encodeURIComponent(plate)}`} className="underline">
              I have a DV placard
            </a>
          </p>
        </>
      )}
    </div>
  );
}

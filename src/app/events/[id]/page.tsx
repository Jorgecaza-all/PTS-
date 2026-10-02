"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type EventLot = { id: string; name: string; accessType: "OPEN_LOT" | "GATE_ACCESS" };
type EventDetail = { id: string; name: string; price: number; lots: EventLot[]; endedAt: string | null };

// Screen 3: "Parking for [Event]" — Name + payment, matching the wireframe.
// Pay redirects to Stripe-hosted Checkout (card/Apple Pay/Google Pay/Link all show up
// there automatically) and back to /confirmation/pending, which waits for the
// signature-verified webhook to actually create the permit — see
// /api/stripe/create-checkout-session and /api/stripe/webhook.
export default function EventDetailPage({ params }: { params: { id: string } }) {
  const [name, setName] = useState("");
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
    if (!name.trim() || !plate || !selectedLotId) return;
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: params.id, lotId: selectedLotId, licensePlate: plate, nameOnPermit: name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSubmitting(false);
      setError(data.error ?? "This event is no longer available. Please go back and pick another.");
      return;
    }
    window.location.href = data.url; // hand off to Stripe Checkout
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

          <button
            onClick={handlePay}
            disabled={submitting || !name.trim() || !selectedLotId}
            className="bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-full py-4 w-full"
          >
            {submitting ? "Redirecting…" : event ? `Pay $${(event.price / 100).toFixed(2)}` : "Pay"}
          </button>

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

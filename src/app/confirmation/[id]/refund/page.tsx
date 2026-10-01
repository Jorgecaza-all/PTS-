"use client";

import { useState } from "react";

// Refund request screen — mirrors the plate-change flow, but refunds need staff/office
// review rather than an automatic action, so this just submits a request (which
// notifies the office of parking — see /api/permits/[id]/refund-request) instead of
// changing anything immediately.
export default function RefundRequestPage({ params }: { params: { id: string } }) {
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || !contact.trim()) return;
    const res = await fetch(`/api/permits/${params.id}/refund-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, contact }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h2 className="text-xl font-semibold">Refund Request Submitted</h2>
        <p className="text-gray-600">
          The Office of Parking &amp; Transportation Services has been notified and will reach out using the
          contact info you provided.
        </p>
        <a href={`/confirmation/${params.id}`} className="underline text-sm">
          Back to confirmation
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-center">Request a Refund</h2>
      <p className="text-center text-sm text-gray-600">
        Tell us why, and how to reach you — the office of parking will follow up.
      </p>
      <textarea
        className="border-2 border-gray-800 rounded-lg px-4 py-4"
        placeholder="Reason for refund"
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <input
        className="border-2 border-gray-800 rounded-lg px-4 py-4"
        placeholder="Email or phone number"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />
      {error && <p className="text-red-600 text-sm text-center">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!reason.trim() || !contact.trim()}
        className="bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-full py-4"
      >
        Submit Request
      </button>
    </div>
  );
}

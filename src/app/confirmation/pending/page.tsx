"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const MAX_POLLS = 20; // ~30s of polling before giving up and offering a manual check

// Post-Checkout landing page. The permit is created by the webhook, not this redirect,
// so this just polls until it shows up, then forwards to the real confirmation screen.
export default function PendingPage() {
  return (
    <Suspense>
      <Pending />
    </Suspense>
  );
}

function Pending() {
  const sessionId = useSearchParams().get("session_id");
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const poll = async (attempt: number) => {
      const res = await fetch(`/api/stripe/session-status?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (cancelled) return;

      if (data.permitId) return router.replace(`/confirmation/${data.permitId}`);
      if (data.failed) return setFailed(true);
      if (attempt >= MAX_POLLS) return setSlow(true);
      setTimeout(() => poll(attempt + 1), 1500);
    };
    poll(0);

    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  if (failed) {
    return (
      <p className="text-center text-red-600">
        Payment was not completed. <a href="/" className="underline">Start over</a>
      </p>
    );
  }
  if (slow) {
    return (
      <p className="text-center text-gray-600">
        Still finalizing your payment — this is taking longer than usual.{" "}
        <a href={`/confirmation/pending?session_id=${sessionId}`} className="underline">
          Check again
        </a>
      </p>
    );
  }
  return <p className="text-center text-gray-600">Finalizing your payment…</p>;
}

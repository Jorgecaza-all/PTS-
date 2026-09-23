"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// DV placard flow — self-attestation ONLY. Plate + placard number, nothing else.
// Explicitly no camera/photo step per product decision: the target users skew older
// and any added step risks losing them at the exact friction point this app removes.
export default function DvPlacardPage({ params }: { params: { id: string } }) {
  const [name, setName] = useState("");
  const [placardNumber, setPlacardNumber] = useState("");
  const plate = useSearchParams().get("plate") ?? "";
  const router = useRouter();

  const handleConfirm = async () => {
    if (!name.trim() || !placardNumber.trim() || !plate) return;

    const res = await fetch("/api/permits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licensePlate: plate,
        eventId: params.id,
        lotId: "REPLACE_WITH_SELECTED_LOT_ID",
        nameOnPermit: name,
        permitType: "dv_exempt",
        dvPlacardNumber: placardNumber,
      }),
    });
    const permit = await res.json();
    router.push(`/confirmation/${permit.id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-center mb-2">DV Placard Parking</h2>
      <input
        className="border-2 border-gray-800 rounded-lg px-4 py-4"
        placeholder="Name of Person"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="border-2 border-gray-800 rounded-lg px-4 py-4"
        placeholder="DV Placard Number"
        value={placardNumber}
        onChange={(e) => setPlacardNumber(e.target.value)}
      />
      <button
        onClick={handleConfirm}
        className="bg-sky-400 hover:bg-sky-500 text-white font-semibold rounded-full py-4"
      >
        Confirm
      </button>
    </div>
  );
}

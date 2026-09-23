"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type EventLot = { id: string; name: string; accessType: "OPEN_LOT" | "GATE_ACCESS" };

// DV placard flow — self-attestation ONLY. Plate + placard number, nothing else.
// Explicitly no camera/photo step per product decision: the target users skew older
// and any added step risks losing them at the exact friction point this app removes.
export default function DvPlacardPage({ params }: { params: { id: string } }) {
  const [name, setName] = useState("");
  const [placardNumber, setPlacardNumber] = useState("");
  const [lots, setLots] = useState<EventLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const plate = useSearchParams().get("plate") ?? "";
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/events/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setLots(data.lots ?? []);
        if (data.lots?.length === 1) setSelectedLotId(data.lots[0].id);
      });
  }, [params.id]);

  const handleConfirm = async () => {
    if (!name.trim() || !placardNumber.trim() || !plate || !selectedLotId) return;

    const res = await fetch("/api/permits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licensePlate: plate,
        eventId: params.id,
        lotId: selectedLotId,
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

      {lots.length > 1 && (
        <div>
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

      <button
        onClick={handleConfirm}
        disabled={!selectedLotId}
        className="bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-full py-4"
      >
        Confirm
      </button>
    </div>
  );
}

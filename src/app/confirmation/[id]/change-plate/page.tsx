"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Plate change screen — one-time only, matching the wireframe's warning.
// The API enforces the one-time limit server-side (see api/permits/[id]/route.ts PATCH),
// this client-side check is just to give an immediate, friendly message.
export default function ChangePlatePage({ params }: { params: { id: string } }) {
  const [newPlate, setNewPlate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleConfirm = async () => {
    if (!newPlate.trim()) return;
    const res = await fetch(`/api/permits/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPlate }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push(`/confirmation/${params.id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-center">License Plate Change</h2>
      <p className="text-center font-medium text-red-600">NOTE, YOU CAN ONLY CHANGE IT ONCE</p>
      <input
        className="border-2 border-gray-800 rounded-lg px-4 py-4"
        placeholder="New License Plate"
        value={newPlate}
        onChange={(e) => setNewPlate(e.target.value)}
      />
      {error && <p className="text-red-600 text-sm text-center">{error}</p>}
      <button
        onClick={handleConfirm}
        className="bg-sky-400 hover:bg-sky-500 text-white font-semibold rounded-full py-4"
      >
        Confirm
      </button>
    </div>
  );
}

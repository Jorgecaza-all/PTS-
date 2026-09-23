"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Screen 1: License plate entry — matches the original wireframe exactly.
// Keep this to a single field. Don't add anything else here.
export default function PlateEntryPage() {
  const [plate, setPlate] = useState("");
  const router = useRouter();

  const handleGo = () => {
    if (!plate.trim()) return;
    // Carry the plate forward via query param into the event list.
    router.push(`/events?plate=${encodeURIComponent(plate.trim().toUpperCase())}`);
  };

  return (
    <div className="flex flex-col gap-6 mt-12">
      <input
        className="border-2 border-gray-800 rounded-lg px-4 py-4 text-center tracking-widest"
        placeholder="LICENSE PLATE"
        value={plate}
        onChange={(e) => setPlate(e.target.value)}
        autoCapitalize="characters"
      />
      <button
        onClick={handleGo}
        className="bg-sky-400 hover:bg-sky-500 text-white font-semibold rounded-full py-4"
      >
        GO
      </button>
    </div>
  );
}

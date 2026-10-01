"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Screen 1: License plate entry — matches the original wireframe exactly.
// Keep this to a single field. Don't add anything else here.
export default function PlateEntryPage() {
  return (
    <Suspense>
      <PlateEntry />
    </Suspense>
  );
}

function PlateEntry() {
  // Prefills from ?plate= so "back" from the event list doesn't lose what was typed.
  const [plate, setPlate] = useState(useSearchParams().get("plate") ?? "");
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

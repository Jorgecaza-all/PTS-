"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type EventListItem = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  price: number;
  lots: string[];
};

// Screen 2: "Parking for Events" list — matches the wireframe's event list screen.
export default function EventsPage() {
  return (
    <Suspense>
      <EventsList />
    </Suspense>
  );
}

function EventsList() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const router = useRouter();
  const plate = useSearchParams().get("plate") ?? "";

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then(setEvents);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-center mb-6">Parking for Events</h2>
      <div className="flex flex-col gap-3">
        {events.map((ev) => (
          <button
            key={ev.id}
            onClick={() => router.push(`/events/${ev.id}?plate=${encodeURIComponent(plate)}`)}
            className="text-left border rounded-lg p-4 hover:bg-gray-100"
          >
            <div className="font-medium">{ev.name}</div>
            <div className="text-sm text-gray-600">
              {new Date(ev.startDate).toLocaleString()} — {ev.lots.join(", ")}
            </div>
            <div className="text-sm text-gray-800 mt-1">${(ev.price / 100).toFixed(2)}</div>
          </button>
        ))}
        {events.length === 0 && <p className="text-gray-500 text-center">No upcoming events.</p>}
      </div>
    </div>
  );
}

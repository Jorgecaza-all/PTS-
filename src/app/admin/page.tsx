"use client";

import { useEffect, useState } from "react";
import { StaffLogin } from "@/components/StaffLogin";

type EventLot = { id: string; name: string; accessType: "OPEN_LOT" | "GATE_ACCESS" };
type AdminEvent = { id: string; name: string; date: string; price: number; lots: EventLot[] };
type Permit = {
  id: string;
  licensePlate: string;
  permitType: "purchased" | "staff_issued" | "dv_exempt";
  nameOnPermit: string;
  validUntil: string;
  status: "active" | "expired";
  event: { id: string; name: string };
  lot: { id: string; name: string };
};

// Staff admin — PLACEHOLDER auth only (password checked server-side, see
// /api/admin/login and src/lib/staffAuth.ts). Real staff login must go through UT's
// SSO system (Shibboleth/SAML/OAuth — same system used for Canvas), which requires
// connection details from UT IT before it can be wired up for real. Do not ship this
// password-based login to production.
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);

  if (!authed) return <StaffLogin onAuthed={() => setAuthed(true)} />;

  return <AdminTool onLogout={() => setAuthed(false)} />;
}

function AdminTool({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"issue" | "search">("issue");

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    onLogout();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <TabButton active={tab === "issue"} onClick={() => setTab("issue")}>
            Issue Permit
          </TabButton>
          <TabButton active={tab === "search"} onClick={() => setTab("search")}>
            Search Permits
          </TabButton>
        </div>
        <div className="flex items-center gap-4">
          <a href="/enforcement" className="text-sm underline text-gray-600">
            Gate check
          </a>
          <button onClick={handleLogout} className="text-sm underline text-gray-600">
            Log out
          </button>
        </div>
      </div>

      {tab === "issue" ? <IssuePermitForm /> : <SearchPermits />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium ${
        active ? "bg-sky-400 text-white" : "bg-gray-100 text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function useAdminEvents() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  useEffect(() => {
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []));
  }, []);
  return events;
}

// Issue a staff_issued permit (comp/exemption) directly against a plate + event.
// Spec 4.4: eliminates the old "issue paper exemption, reconcile later" loop.
function IssuePermitForm() {
  const events = useAdminEvents();
  const [eventId, setEventId] = useState("");
  const [lotId, setLotId] = useState("");
  const [plate, setPlate] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<Permit | null>(null);
  const [error, setError] = useState("");

  const selectedEvent = events.find((e) => e.id === eventId);

  const handleIssue = async () => {
    if (!eventId || !lotId || !plate.trim() || !name.trim()) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/admin/permits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licensePlate: plate, eventId, lotId, nameOnPermit: name }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to issue permit");
      return;
    }
    const permit = await res.json();
    setIssued(permit);
    setPlate("");
    setName("");
  };

  return (
    <div className="flex flex-col gap-4">
      <select
        className="border-2 border-gray-800 rounded-lg px-4 py-4"
        value={eventId}
        onChange={(e) => {
          setEventId(e.target.value);
          setLotId("");
        }}
      >
        <option value="">Select an event</option>
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name} — {new Date(ev.date).toLocaleString()}
          </option>
        ))}
      </select>

      {selectedEvent && (
        <select
          className="border-2 border-gray-800 rounded-lg px-4 py-4"
          value={lotId}
          onChange={(e) => setLotId(e.target.value)}
        >
          <option value="">Select a lot/garage</option>
          {selectedEvent.lots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.name}
            </option>
          ))}
        </select>
      )}

      <input
        className="border-2 border-gray-800 rounded-lg px-4 py-4"
        placeholder="License Plate"
        value={plate}
        onChange={(e) => setPlate(e.target.value)}
      />
      <input
        className="border-2 border-gray-800 rounded-lg px-4 py-4"
        placeholder="Name on Permit"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleIssue}
        disabled={submitting || !eventId || !lotId || !plate.trim() || !name.trim()}
        className="bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-full py-4"
      >
        {submitting ? "Issuing..." : "Issue Permit"}
      </button>

      {issued && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          Issued permit for {issued.licensePlate} — {issued.lot.name}, {issued.event.name}.
        </p>
      )}
    </div>
  );
}

// Search/view permits by event and/or plate — same table for all three permit
// types, so this is the one lookup staff need regardless of how a permit originated.
function SearchPermits() {
  const events = useAdminEvents();
  const [eventId, setEventId] = useState("");
  const [plate, setPlate] = useState("");
  const [results, setResults] = useState<Permit[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const params = new URLSearchParams();
    if (eventId) params.set("eventId", eventId);
    if (plate.trim()) params.set("plate", plate.trim());

    const res = await fetch(`/api/admin/permits?${params.toString()}`);
    const data = await res.json();
    setResults(Array.isArray(data) ? data : []);
    setSearched(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <select
        className="border-2 border-gray-800 rounded-lg px-4 py-4"
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
      >
        <option value="">All events</option>
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name} — {new Date(ev.date).toLocaleString()}
          </option>
        ))}
      </select>

      <input
        className="border-2 border-gray-800 rounded-lg px-4 py-4"
        placeholder="License Plate (optional)"
        value={plate}
        onChange={(e) => setPlate(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
      />

      <button
        onClick={handleSearch}
        className="bg-sky-400 hover:bg-sky-500 text-white font-semibold rounded-full py-4"
      >
        Search
      </button>

      {searched && results.length === 0 && (
        <p className="text-gray-500 text-center">No permits found.</p>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((p) => (
            <div key={p.id} className="border rounded-lg p-4">
              <div className="flex justify-between">
                <span className="font-medium">{p.licensePlate}</span>
                <span
                  className={`text-xs font-semibold uppercase ${
                    p.status === "active" ? "text-green-700" : "text-gray-500"
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {p.event.name} — {p.lot.name}
              </div>
              <div className="text-sm text-gray-600">{p.nameOnPermit}</div>
              <div className="text-xs text-gray-500 mt-1">
                {p.permitType} · valid until {new Date(p.validUntil).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

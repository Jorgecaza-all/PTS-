"use client";

import { useEffect, useState } from "react";
import { StaffLogin } from "@/components/StaffLogin";

type EventLot = { id: string; name: string; accessType: "OPEN_LOT" | "GATE_ACCESS" };
type AdminEvent = { id: string; name: string; startDate: string; endDate: string; price: number; lots: EventLot[] };
type Permit = {
  id: string;
  licensePlate: string;
  permitType: "purchased" | "staff_issued" | "dv_exempt";
  nameOnPermit: string;
  validFrom: string;
  validUntil: string;
  status: "active" | "expired";
  enteredAt: string | null;
  exitedAt: string | null;
  event: { id: string; name: string };
  lot: { id: string; name: string; accessType: "OPEN_LOT" | "GATE_ACCESS" };
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
  const [tab, setTab] = useState<"issue" | "search" | "events" | "refunds">("issue");

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
          <TabButton active={tab === "events"} onClick={() => setTab("events")}>
            Manage Events
          </TabButton>
          <TabButton active={tab === "refunds"} onClick={() => setTab("refunds")}>
            Refund Requests
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

      {tab === "issue" && <IssuePermitForm />}
      {tab === "search" && <SearchPermits />}
      {tab === "events" && <ManageEvents />}
      {tab === "refunds" && <RefundRequests />}
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

function useAllLots() {
  const [lots, setLots] = useState<EventLot[]>([]);
  useEffect(() => {
    fetch("/api/admin/lots")
      .then((r) => r.json())
      .then((data) => setLots(Array.isArray(data) ? data : []));
  }, []);
  return lots;
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
            {ev.name} — {new Date(ev.startDate).toLocaleString()}
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
            {ev.name} — {new Date(ev.startDate).toLocaleString()}
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
                {p.permitType} · valid {new Date(p.validFrom).toLocaleString()} – {new Date(p.validUntil).toLocaleString()}
              </div>
              {p.lot.accessType === "GATE_ACCESS" && (
                <div className="text-xs text-gray-500">
                  {p.enteredAt ? `In: ${new Date(p.enteredAt).toLocaleString()}` : "Not entered"}
                  {p.exitedAt ? ` · Out: ${new Date(p.exitedAt).toLocaleString()}` : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Create an event, assign its lots/garages, and set the flat price that applies to
// every lot listed (README priority 4 — events/lots were previously only seeded
// manually). All lots on an event share the same price per the spec.
function ManageEvents() {
  const lots = useAllLots();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [name, setName] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchEvents = () => {
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []));
  };

  useEffect(fetchEvents, []);

  const toggleLot = (lotId: string) => {
    setSelectedLotIds((prev) => (prev.includes(lotId) ? prev.filter((id) => id !== lotId) : [...prev, lotId]));
  };

  const priceCents = Math.round(parseFloat(priceDollars || "0") * 100);
  const canSubmit =
    name.trim() && startDateTime && endDateTime && !isNaN(priceCents) && priceCents >= 0 && selectedLotIds.length > 0;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        startDate: new Date(startDateTime).toISOString(),
        endDate: new Date(endDateTime).toISOString(),
        price: priceCents,
        lotIds: selectedLotIds,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create event");
      return;
    }
    setName("");
    setStartDateTime("");
    setEndDateTime("");
    setPriceDollars("");
    setSelectedLotIds([]);
    fetchEvents();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h3 className="font-medium">Create Event</h3>
        <input
          className="border-2 border-gray-800 rounded-lg px-4 py-4"
          placeholder="Event Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <label className="text-sm text-gray-600">Start</label>
          <input
            type="datetime-local"
            className="border-2 border-gray-800 rounded-lg px-4 py-4 w-full"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">End</label>
          <input
            type="datetime-local"
            className="border-2 border-gray-800 rounded-lg px-4 py-4 w-full"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
          />
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          Permits will be valid from 1:30 before start until 1:30 after end.
        </p>
        <input
          type="number"
          min="0"
          step="0.01"
          className="border-2 border-gray-800 rounded-lg px-4 py-4"
          placeholder="Price (USD, applies to every lot below)"
          value={priceDollars}
          onChange={(e) => setPriceDollars(e.target.value)}
        />

        <div>
          <p className="text-sm font-medium mb-2">Lots/garages for this event</p>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto border rounded-lg p-2">
            {lots.map((lot) => (
              <label key={lot.id} className="flex items-center gap-2 px-2 py-1">
                <input
                  type="checkbox"
                  checked={selectedLotIds.includes(lot.id)}
                  onChange={() => toggleLot(lot.id)}
                />
                <span>{lot.name}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={submitting || !canSubmit}
          className="bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-full py-4"
        >
          {submitting ? "Creating..." : "Create Event"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Existing Events</h3>
        {events.length === 0 && <p className="text-gray-500 text-center">No events yet.</p>}
        {events.map((ev) => (
          <div key={ev.id} className="border rounded-lg p-4">
            <div className="font-medium">{ev.name}</div>
            <div className="text-sm text-gray-600">
              {new Date(ev.startDate).toLocaleString()} – {new Date(ev.endDate).toLocaleString()} — $
              {(ev.price / 100).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{ev.lots.map((l) => l.name).join(", ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Staff view of self-service refund requests (spec's open refund question — see
// /api/permits/[id]/refund-request and src/lib/email.ts). Emailing the office is a
// stub until UT Parking gives us a real mailbox/API, so this list is how staff
// actually see requests for now.
function RefundRequests() {
  const [requests, setRequests] = useState<
    Array<{
      id: string;
      reason: string;
      contact: string;
      createdAt: string;
      permit: { id: string; licensePlate: string; event: { name: string }; lot: { name: string } };
    }>
  >([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/refund-requests")
      .then((r) => r.json())
      .then((data) => {
        setRequests(Array.isArray(data) ? data : []);
        setLoaded(true);
      });
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-medium">Refund Requests</h3>
      {loaded && requests.length === 0 && <p className="text-gray-500 text-center">No refund requests.</p>}
      {requests.map((r) => (
        <div key={r.id} className="border rounded-lg p-4">
          <div className="flex justify-between">
            <span className="font-medium">{r.permit.licensePlate}</span>
            <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</span>
          </div>
          <div className="text-sm text-gray-600">
            {r.permit.event.name} — {r.permit.lot.name}
          </div>
          <div className="text-sm mt-1">{r.reason}</div>
          <div className="text-xs text-gray-500 mt-1">Contact: {r.contact}</div>
        </div>
      ))}
    </div>
  );
}

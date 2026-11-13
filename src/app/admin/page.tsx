"use client";

import { useEffect, useState } from "react";
import { StaffLogin } from "@/components/StaffLogin";

type EventLot = { id: string; name: string; accessType: "OPEN_LOT" | "GATE_ACCESS" };
type AdminEvent = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  endedAt: string | null;
  price: number;
  lots: EventLot[];
};
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
  const [tab, setTab] = useState<"issue" | "search" | "events" | "refunds" | "stats">("issue");

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
          <TabButton active={tab === "stats"} onClick={() => setTab("stats")}>
            Stats
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
      {tab === "stats" && <Stats />}
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
  const events = useAdminEvents().filter((e) => !e.endedAt);
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

  const handleEnd = async (id: string) => {
    if (!confirm("End this event? It will be hidden from the public list and stop accepting new permits.")) return;
    await fetch(`/api/admin/events/${id}/end`, { method: "POST" });
    fetchEvents();
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
            <div className="flex items-center justify-between">
              <div className="font-medium">{ev.name}</div>
              {ev.endedAt ? (
                <span className="text-xs font-semibold uppercase text-gray-500">Ended</span>
              ) : (
                <button onClick={() => handleEnd(ev.id)} className="text-xs text-red-600 underline">
                  End Event
                </button>
              )}
            </div>
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

type LotStat = { lotId: string; name: string; capacity: number | null; purchased: number; dv_exempt: number; staff_issued: number };
type EventStat = { id: string; name: string; startDate: string; endDate: string; price: number; endedAt: string | null; livePermits: number; lots: LotStat[] };

// Donut colors per spec; the empty ring is gray.
const SLICES = [
  { key: "purchased", label: "Purchased", color: "#f97316" },
  { key: "dv_exempt", label: "DV", color: "#14b8a6" },
  { key: "staff_issued", label: "Staff", color: "#3b82f6" },
] as const;

// Donut = permit proportions (not capacity). Native SVG circles via stroke-dasharray, no chart lib.
function Donut({ l, total }: { l: LotStat; total: number }) {
  let offset = 0;
  return (
    <svg viewBox="0 0 42 42" className="w-40 h-40 shrink-0" role="img" aria-label={`${total} permits`}>
      <circle cx="21" cy="21" r="15.915" fill="none" stroke="#e5e7eb" strokeWidth="6" />
      {SLICES.map((s) => {
        const len = total ? (l[s.key] / total) * 100 : 0;
        const el = (
          <circle key={s.key} cx="21" cy="21" r="15.915" fill="none" stroke={s.color} strokeWidth="6"
            strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={25 - offset} />
        );
        offset += len;
        return el;
      })}
      <text x="21" y="21" textAnchor="middle" dominantBaseline="central" className="text-[8px] font-semibold" fill="currentColor">
        {total}
      </text>
    </svg>
  );
}

function LotCard({ l, onSave }: { l: LotStat; onSave: (cap: number) => Promise<string | null> }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const total = l.purchased + l.dv_exempt + l.staff_issued;
  const pct = l.capacity ? Math.round((total / l.capacity) * 100) : 0;
  const over = !!l.capacity && total > l.capacity;
  const id = `lot-${l.lotId}`;

  const save = async () => {
    // Positive whole numbers only; the server re-validates.
    if (!/^[1-9]\d*$/.test(val.trim())) return setErr("Enter a positive whole number");
    const e = await onSave(Number(val));
    if (e) return setErr(e);
    setEditing(false);
  };

  return (
    <div className="border rounded-lg">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}
        className="w-full text-left p-4 flex flex-col gap-1">
        <span className="font-medium">{l.name} <span aria-hidden>{open ? "▲" : "▼"}</span></span>
        <span className="text-sm text-gray-600">Purchased {l.purchased} · DV {l.dv_exempt} · Staff {l.staff_issued}</span>
        {l.capacity && (
          <span className="text-sm">
            {total} / {l.capacity} spaces · {pct}% full
            {over && <span className="ml-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">Over capacity</span>}
          </span>
        )}
      </button>
      <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <input type="text" inputMode="numeric" aria-label={`Capacity for ${l.name}`} value={val} autoFocus
              onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()}
              className="border-2 border-gray-800 rounded-lg px-3 py-2 w-28" />
            <button onClick={save} className="text-sm underline">Save</button>
            <button onClick={() => { setEditing(false); setErr(""); }} className="text-sm underline text-gray-600">Cancel</button>
            {err && <span role="alert" className="text-sm text-red-600">{err}</span>}
          </>
        ) : (
          <button onClick={() => { setVal(String(l.capacity ?? "")); setEditing(true); }} className="text-sm underline text-sky-600">
            {l.capacity ? "Edit capacity" : "Set capacity"}
          </button>
        )}
      </div>
      {open && (
        <div id={id} className="px-4 pb-4 flex flex-wrap items-center gap-6">
          <Donut l={l} total={total} />
          <ul className="text-sm flex flex-col gap-1">
            {SLICES.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.label}: {l[s.key]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// One card per event with its lot cards nested inside; every action/edit is keyed by that event's id.
function EventCard({ ev, reload }: { ev: EventStat; reload: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState("");

  const call = async (path: string, init: RequestInit) => {
    const res = await fetch(`/api/admin/events/${ev.id}${path}`, init);
    const data = await res.json().catch(() => ({}));
    return res.ok ? data : { error: data.error ?? "Action failed" };
  };
  const saveCapacity = async (lotId: string, capacity: number) => {
    const d = await call(`/lots/${lotId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ capacity }) });
    if (d.error) return d.error as string;
    await reload();
    return null;
  };
  const end = async () => {
    setMsg((await call("/end", { method: "POST" })).error ?? "");
    await reload();
  };
  const del = async () => {
    const d = await call("", { method: "DELETE" });
    setConfirm(false);
    setMsg(d.error ?? (d.liveKept ? `Event kept: ${d.liveKept} live-payment permit(s) can't be deleted. Its demo/sandbox records were removed.` : ""));
    await reload();
  };

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">{ev.name}</div>
        <div className="flex items-center gap-3 shrink-0">
          {ev.endedAt ? <span className="text-xs font-semibold uppercase text-gray-500">Ended</span> : (
            <button onClick={end} className="text-xs text-red-600 underline">End Event</button>
          )}
          <button onClick={() => setConfirm(true)} className="text-xs text-red-600 underline">Delete Event</button>
        </div>
      </div>
      <div className="text-sm text-gray-600">
        {new Date(ev.startDate).toLocaleString()} – {new Date(ev.endDate).toLocaleString()} — ${(ev.price / 100).toFixed(2)}
      </div>
      <div className="text-xs text-gray-500">{ev.lots.map((l) => l.name).join(", ")}</div>
      {msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
      {ev.lots.map((l) => <LotCard key={l.lotId} l={l} onSave={(c) => saveCapacity(l.lotId, c)} />)}

      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10" onKeyDown={(e) => e.key === "Escape" && setConfirm(false)}>
          <div role="alertdialog" aria-modal="true" aria-label="Confirm delete" className="bg-white rounded-lg p-6 max-w-sm w-full flex flex-col gap-4">
            <p>
              Permanently delete "{ev.name}"? This removes the event, its lots and capacities, and all its permits and demo/sandbox payment records.
              {ev.livePermits > 0 && ` ${ev.livePermits} live-payment permit(s) cannot be deleted: the event and those records will be kept.`}
            </p>
            <div className="flex gap-2 justify-end">
              <button autoFocus onClick={() => setConfirm(false)} className="px-4 py-2 rounded-full bg-gray-100">Cancel</button>
              <button onClick={del} className="px-4 py-2 rounded-full bg-red-600 text-white">Delete Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stats() {
  const [events, setEvents] = useState<EventStat[] | null>(null);
  const load = () =>
    fetch("/api/admin/stats").then((r) => r.json()).then((d) => setEvents(Array.isArray(d.events) ? d.events : []));
  useEffect(() => void load(), []);

  if (!events) return <p className="text-gray-500 text-center">Loading...</p>;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Existing Events</h3>
        <button onClick={load} className="text-sm underline text-gray-600">Refresh</button>
      </div>
      {events.length === 0 && <p className="text-gray-500 text-center">No events yet.</p>}
      {events.map((e) => <EventCard key={e.id} ev={e} reload={load} />)}
    </div>
  );
}

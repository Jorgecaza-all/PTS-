"use client";

import { useEffect, useState } from "react";
import { StaffLogin } from "@/components/StaffLogin";

type Lot = { id: string; name: string; accessType: "OPEN_LOT" | "GATE_ACCESS" };
type PermitRecord = {
  id: string;
  licensePlate: string;
  permitType: "purchased" | "staff_issued" | "dv_exempt";
  status: "active" | "expired";
  validUntil: string;
  valid: boolean;
  event: { name: string };
  lot: { name: string };
};

// Enforcement / gate-check (spec 4.5, README priority 3): one lookup path for all
// three permit types. GATE_ACCESS garages scan the QR (a barcode-scanner "keyboard
// wedge" typing the permit id works the same as a camera scan here); OPEN_LOT staff
// walk the lot and check by plate. Same permits table, same validity check either way.
export default function EnforcementPage() {
  const [authed, setAuthed] = useState(false);

  if (!authed) return <StaffLogin onAuthed={() => setAuthed(true)} />;

  return <EnforcementTool onLogout={() => setAuthed(false)} />;
}

function EnforcementTool({ onLogout }: { onLogout: () => void }) {
  const [mode, setMode] = useState<"plate" | "permitId">("plate");
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotId, setLotId] = useState("");
  const [plate, setPlate] = useState("");
  const [permitId, setPermitId] = useState("");
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<PermitRecord[] | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch("/api/admin/lots")
      .then((r) => r.json())
      .then((data) => setLots(Array.isArray(data) ? data : []));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    onLogout();
  };

  const handleCheck = async () => {
    setChecking(true);
    setResults(null);
    setNotFound(false);

    if (mode === "permitId") {
      if (!permitId.trim()) {
        setChecking(false);
        return;
      }
      const res = await fetch(`/api/enforcement/permits/${encodeURIComponent(permitId.trim())}`);
      setChecking(false);
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setResults([data.permit ? { ...data.permit, valid: data.valid } : null].filter(Boolean) as PermitRecord[]);
    } else {
      if (!plate.trim() || !lotId) {
        setChecking(false);
        return;
      }
      const res = await fetch(
        `/api/enforcement/search?plate=${encodeURIComponent(plate.trim())}&lotId=${encodeURIComponent(lotId)}`
      );
      setChecking(false);
      const data = await res.json();
      setResults(data.permits ?? []);
      setNotFound((data.permits ?? []).length === 0);
    }
  };

  const anyValid = results?.some((r) => r.valid) ?? false;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gate Check</h2>
        <div className="flex items-center gap-4">
          <a href="/admin" className="text-sm underline text-gray-600">
            Admin
          </a>
          <button onClick={handleLogout} className="text-sm underline text-gray-600">
            Log out
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <ModeButton active={mode === "plate"} onClick={() => setMode("plate")}>
          Check by Plate
        </ModeButton>
        <ModeButton active={mode === "permitId"} onClick={() => setMode("permitId")}>
          Scan / Enter Permit ID
        </ModeButton>
      </div>

      {mode === "plate" ? (
        <div className="flex flex-col gap-4">
          <select
            className="border-2 border-gray-800 rounded-lg px-4 py-4"
            value={lotId}
            onChange={(e) => setLotId(e.target.value)}
          >
            <option value="">Select this lot/garage</option>
            {lots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.name}
              </option>
            ))}
          </select>
          <input
            className="border-2 border-gray-800 rounded-lg px-4 py-4"
            placeholder="License Plate"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          />
        </div>
      ) : (
        <input
          autoFocus
          className="border-2 border-gray-800 rounded-lg px-4 py-4"
          placeholder="Permit ID (scan QR or type)"
          value={permitId}
          onChange={(e) => setPermitId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
        />
      )}

      <button
        onClick={handleCheck}
        disabled={checking || (mode === "plate" ? !plate.trim() || !lotId : !permitId.trim())}
        className="bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-full py-4"
      >
        {checking ? "Checking..." : "Check"}
      </button>

      {notFound && (
        <p className="text-center font-semibold text-red-700 bg-red-50 border border-red-200 rounded p-4">
          NOT VALID — no matching permit found
        </p>
      )}

      {results && results.length > 0 && (
        <div className="flex flex-col gap-2">
          <p
            className={`text-center font-semibold rounded p-4 ${
              anyValid
                ? "text-green-700 bg-green-50 border border-green-200"
                : "text-red-700 bg-red-50 border border-red-200"
            }`}
          >
            {anyValid ? "VALID" : "NOT VALID"}
          </p>
          {results.map((p) => (
            <div key={p.id} className="border rounded-lg p-4">
              <div className="flex justify-between">
                <span className="font-medium">{p.licensePlate}</span>
                <span className={`text-xs font-semibold uppercase ${p.valid ? "text-green-700" : "text-red-600"}`}>
                  {p.valid ? "valid" : "not valid"}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {p.event.name} — {p.lot.name}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {p.permitType} · status {p.status} · valid until {new Date(p.validUntil).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeButton({
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

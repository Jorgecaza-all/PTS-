"use client";

import { useState } from "react";

// Placeholder auth ONLY — password checked server-side against STAFF_DEV_PASSWORD
// (see /api/admin/login and src/lib/staffAuth.ts). Real staff login must go through
// UT's SSO system once UT IT provides connection details. Shared by /admin and
// /enforcement so both staff tools sit behind the same session.
export function StaffLogin({ onAuthed }: { onAuthed: () => void }) {
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoggingIn(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoggingIn(false);
    if (res.ok) onAuthed();
    else setError("Incorrect password");
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
        Placeholder login for dev/testing only. Replace with UT SSO before launch.
      </p>
      <input
        type="password"
        className="border-2 border-gray-800 rounded-lg px-4 py-4"
        placeholder="Staff password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleLogin}
        disabled={loggingIn}
        className="bg-sky-400 hover:bg-sky-500 text-white font-semibold rounded-full py-4"
      >
        {loggingIn ? "Logging in..." : "Log in"}
      </button>
    </div>
  );
}

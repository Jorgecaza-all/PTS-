"use client";

import { useState } from "react";

// Staff admin — PLACEHOLDER auth only (password from env), for local dev/testing.
// Real staff login must go through UT's SSO system (Shibboleth/SAML/OAuth — same
// system used for Canvas), which requires connection details from UT IT before it
// can be wired up for real. Do not ship this password-based login to production.
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");

  if (!authed) {
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
        />
        <button
          onClick={() => {
            if (password === process.env.NEXT_PUBLIC_STAFF_DEV_PASSWORD) setAuthed(true);
            else alert("Incorrect password");
          }}
          className="bg-sky-400 hover:bg-sky-500 text-white font-semibold rounded-full py-4"
        >
          Log in
        </button>
      </div>
    );
  }

  // TODO: build out the real admin tool here — issue staff/comp permits against a
  // plate + event, and search/view permits by event or plate (see spec section 4.4 / 6).
  return <p>Staff admin tool goes here.</p>;
}

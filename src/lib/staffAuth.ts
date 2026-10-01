import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

// Placeholder staff auth ONLY — see README/spec: real login must go through UT's
// SSO (Shibboleth/SAML/OAuth) once UT IT provides connection details. This exists
// so the admin/enforcement tools can be built/tested without blocking on that.
//
// Neither credential reaches the browser after login: the login route checks them
// server-side and sets a cookie containing a hash of both, so cookie theft doesn't
// reveal the username/password and the client bundle never sees them.
export const STAFF_COOKIE_NAME = "staff_session";

function expectedCookieValue(): string | null {
  const username = process.env.STAFF_DEV_USERNAME;
  const password = process.env.STAFF_DEV_PASSWORD;
  if (!username || !password) return null;
  return createHash("sha256").update(`${username}:${password}`).digest("hex");
}

export function checkStaffCredentials(username: string, password: string): boolean {
  const expected = expectedCookieValue();
  if (!expected || !username || !password) return false;
  const candidate = createHash("sha256").update(`${username}:${password}`).digest("hex");
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

export function staffSessionCookieValue(): string {
  const expected = expectedCookieValue();
  if (!expected) throw new Error("STAFF_DEV_USERNAME/STAFF_DEV_PASSWORD are not set");
  return expected;
}

export function isStaffAuthed(req: Request): boolean {
  const expected = expectedCookieValue();
  if (!expected) return false;

  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STAFF_COOKIE_NAME}=`));
  if (!match) return false;

  const value = match.slice(STAFF_COOKIE_NAME.length + 1);
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export function requireStaffAuth(req: Request): NextResponse | null {
  if (!isStaffAuthed(req)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return null;
}

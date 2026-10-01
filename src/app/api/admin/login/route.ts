import { NextResponse } from "next/server";
import { checkStaffCredentials, staffSessionCookieValue, STAFF_COOKIE_NAME } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// POST /api/admin/login — placeholder username/password login for staff (see staffAuth.ts).
// body: { username, password }
export async function POST(req: Request) {
  const { username, password } = await req.json();

  if (!checkStaffCredentials(username, password)) {
    return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_COOKIE_NAME, staffSessionCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hour shift
  });
  return res;
}

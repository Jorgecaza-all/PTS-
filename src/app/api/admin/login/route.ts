import { NextResponse } from "next/server";
import { checkStaffPassword, staffSessionCookieValue, STAFF_COOKIE_NAME } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// POST /api/admin/login — placeholder password login for staff (see staffAuth.ts).
// body: { password }
export async function POST(req: Request) {
  const { password } = await req.json();

  if (!checkStaffPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
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

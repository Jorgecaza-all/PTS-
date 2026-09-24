import { NextResponse } from "next/server";
import { STAFF_COOKIE_NAME } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// POST /api/admin/logout
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}

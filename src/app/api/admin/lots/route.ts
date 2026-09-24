import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/lots — all lots/garages, for the enforcement tool's "which lot am I
// checking" picker (independent of any one event).
export async function GET(req: Request) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const lots = await prisma.lot.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(lots);
}

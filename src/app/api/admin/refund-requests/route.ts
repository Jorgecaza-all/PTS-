import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/refund-requests — staff view of self-service refund requests
// (see /api/permits/[id]/refund-request). Notifying the office is currently a
// console-log stub (src/lib/email.ts), so this list is the actual way staff see
// requests until UT Parking provides a real mailbox/API.
export async function GET(req: Request) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const requests = await prisma.refundRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { permit: { include: { event: true, lot: true } } },
    take: 200,
  });

  return NextResponse.json(requests);
}

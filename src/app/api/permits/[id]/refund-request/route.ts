import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRefundRequestEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST /api/permits/:id/refund-request — self-service refund request from the
// confirmation page, mirroring the plate-change flow's security posture (public,
// scoped only by knowing the permit id from the confirmation link/QR — no separate
// auth, same as PATCH /api/permits/:id). Refunds need staff/office review rather
// than an automatic action, so this just records the request and notifies the
// office (see src/lib/email.ts — a stub until UT Parking gives us a real mailbox).
// body: { reason, contact }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { reason, contact } = await req.json();

  if (!reason?.trim() || !contact?.trim()) {
    return NextResponse.json({ error: "reason and contact are required" }, { status: 400 });
  }

  const permit = await prisma.permit.findUnique({
    where: { id: params.id },
    include: { event: true },
  });
  if (!permit) {
    return NextResponse.json({ error: "Permit not found" }, { status: 404 });
  }

  const request = await prisma.refundRequest.create({
    data: { permitId: permit.id, reason: reason.trim(), contact: contact.trim() },
  });

  await sendRefundRequestEmail({
    permitId: permit.id,
    licensePlate: permit.licensePlate,
    eventName: permit.event.name,
    reason: request.reason,
    contact: request.contact,
  });

  return NextResponse.json({ ok: true });
}

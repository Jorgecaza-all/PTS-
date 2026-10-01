import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// POST /api/admin/events/:id/end — hides the event from public selection and blocks
// new permits (see the endedAt checks in /api/permits and /api/admin/permits).
// Idempotent: ending an already-ended event just returns it unchanged. Non-destructive
// — existing permits, their validity window, and QR lookups are untouched.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const ended = event.endedAt ?? (await prisma.event.update({ where: { id: params.id }, data: { endedAt: new Date() } })).endedAt;
  return NextResponse.json({ id: event.id, endedAt: ended });
}

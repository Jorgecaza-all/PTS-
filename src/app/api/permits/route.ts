import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { permitWindowForEvent } from "@/lib/permits";

// POST /api/permits
// Public write path for the DV placard flow only. "purchased" permits are created
// exclusively by the signature-verified Stripe webhook (see /api/stripe/webhook) —
// never from a client request — and "staff_issued" only via /api/admin/permits.
// body: { licensePlate, eventId, lotId, nameOnPermit, permitType: 'dv_exempt', dvPlacardNumber }
export async function POST(req: Request) {
  const { licensePlate, eventId, lotId, nameOnPermit, permitType, dvPlacardNumber } = await req.json();

  if (permitType !== "dv_exempt") {
    return NextResponse.json({ error: "Invalid permitType" }, { status: 400 });
  }
  if (!dvPlacardNumber?.trim()) {
    return NextResponse.json({ error: "dvPlacardNumber required for DV permits" }, { status: 400 });
  }
  if (!licensePlate?.trim() || !nameOnPermit?.trim() || !eventId || !lotId) {
    return NextResponse.json({ error: "licensePlate, nameOnPermit, eventId, and lotId are required" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (event.endedAt) {
    return NextResponse.json({ error: "This event has ended and is no longer accepting payments" }, { status: 410 });
  }

  const eventLot = await prisma.eventLot.findUnique({
    where: { eventId_lotId: { eventId, lotId } },
  });
  if (!eventLot) {
    return NextResponse.json({ error: "Selected lot is not valid for this event" }, { status: 400 });
  }

  const { validFrom, validUntil } = permitWindowForEvent(event);

  const permit = await prisma.permit.create({
    data: {
      licensePlate: licensePlate.toUpperCase(),
      eventId,
      lotId,
      nameOnPermit,
      permitType: "dv_exempt",
      dvPlacardNumber,
      validFrom,
      validUntil,
    },
  });

  return NextResponse.json(permit);
}

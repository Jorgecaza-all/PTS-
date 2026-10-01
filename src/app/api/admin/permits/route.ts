import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";
import { permitWindowForEvent } from "@/lib/permits";

export const dynamic = "force-dynamic";

// GET /api/admin/permits?eventId=&plate= — search/view permits by event and/or plate,
// for the staff admin tool (spec section 4.4 / 6). Same permits table every permit
// type lives in, regardless of how it originated.
export async function GET(req: Request) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId") || undefined;
  const plate = searchParams.get("plate") || undefined;

  const permits = await prisma.permit.findMany({
    where: {
      eventId,
      licensePlate: plate ? plate.toUpperCase() : undefined,
    },
    include: { event: true, lot: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(permits);
}

// POST /api/admin/permits — staff issues a comp/exemption permit directly against a
// plate for an event (spec section 4.4). Always written as permitType: staff_issued;
// this is the only path allowed to create that type (see /api/permits, which rejects it).
// body: { licensePlate, eventId, lotId, nameOnPermit }
export async function POST(req: Request) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const { licensePlate, eventId, lotId, nameOnPermit } = await req.json();

  if (!licensePlate || !eventId || !lotId || !nameOnPermit) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (event.endedAt) {
    return NextResponse.json({ error: "This event has ended and is no longer accepting permits" }, { status: 410 });
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
      permitType: "staff_issued",
      validFrom,
      validUntil,
    },
    include: { event: true, lot: true },
  });

  return NextResponse.json(permit);
}

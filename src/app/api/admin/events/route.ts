import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/events — all events (not just upcoming) with their lots, for the
// staff admin tool's event pickers (issuing a permit, searching by event).
export async function GET(req: Request) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const events = await prisma.event.findMany({
    orderBy: { startDate: "desc" },
    include: { lots: { include: { lot: true } } },
  });

  return NextResponse.json(
    events.map((e) => ({
      id: e.id,
      name: e.name,
      startDate: e.startDate,
      endDate: e.endDate,
      endedAt: e.endedAt,
      price: e.price,
      lots: e.lots.map((el) => ({ id: el.lot.id, name: el.lot.name, accessType: el.lot.accessType })),
    }))
  );
}

// POST /api/admin/events — staff creates an event, assigns its lots/garages, and sets
// the flat price that applies to every lot listed (spec section 5/README priority 4).
// body: { name, startDate, endDate (ISO strings), price (cents), lotIds: string[] }
export async function POST(req: Request) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const { name, startDate, endDate, price, lotIds } = await req.json();

  if (!name?.trim() || !startDate || !endDate || !Number.isInteger(price) || price < 0) {
    return NextResponse.json(
      { error: "name, startDate, endDate, and a non-negative integer price (cents) are required" },
      { status: 400 }
    );
  }
  if (!Array.isArray(lotIds) || lotIds.length === 0) {
    return NextResponse.json({ error: "At least one lot must be assigned" }, { status: 400 });
  }

  const parsedStart = new Date(startDate);
  const parsedEnd = new Date(endDate);
  if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
    return NextResponse.json({ error: "Invalid startDate or endDate" }, { status: 400 });
  }
  if (parsedEnd <= parsedStart) {
    return NextResponse.json({ error: "endDate must be after startDate" }, { status: 400 });
  }

  const lots = await prisma.lot.findMany({ where: { id: { in: lotIds } } });
  if (lots.length !== lotIds.length) {
    return NextResponse.json({ error: "One or more lots not found" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      name: name.trim(),
      startDate: parsedStart,
      endDate: parsedEnd,
      price,
      lots: { create: lotIds.map((lotId: string) => ({ lotId })) },
    },
    include: { lots: { include: { lot: true } } },
  });

  return NextResponse.json({
    id: event.id,
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate,
    price: event.price,
    lots: event.lots.map((el) => ({ id: el.lot.id, name: el.lot.name, accessType: el.lot.accessType })),
  });
}

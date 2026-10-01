import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reads live data on every request — never prerender/cache this at build time.
export const dynamic = "force-dynamic";

// GET /api/events — list upcoming events with their lots, for the event-list screen.
export async function GET() {
  const events = await prisma.event.findMany({
    where: { endDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    include: { lots: { include: { lot: true } } },
  });

  return NextResponse.json(
    events.map((e) => ({
      id: e.id,
      name: e.name,
      startDate: e.startDate,
      endDate: e.endDate,
      price: e.price,
      lots: e.lots.map((el) => el.lot.name),
    }))
  );
}

// TODO: POST /api/events — staff-only, create/edit events. Gate behind the staff SSO
// login once UT IT provides real connection details (see .env.example).

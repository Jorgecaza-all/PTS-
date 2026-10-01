import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reads live data on every request — never prerender/cache this at build time.
export const dynamic = "force-dynamic";

// GET /api/events/:id — event detail plus its lots (with ids), for the lot-picker
// step on the payment and DV screens. An event can have multiple lots/garages,
// all at the event's flat price.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { lots: { include: { lot: true } } },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: event.id,
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate,
    price: event.price,
    lots: event.lots.map((el) => ({ id: el.lot.id, name: el.lot.name, accessType: el.lot.accessType })),
  });
}

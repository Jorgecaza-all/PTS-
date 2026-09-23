import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/permits/:id — used by the confirmation and plate-change screens.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const permit = await prisma.permit.findUnique({
    where: { id: params.id },
    include: { event: true, lot: true },
  });
  if (!permit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(permit);
}

// PATCH /api/permits/:id — used only for the one-time plate correction.
// body: { newPlate: string }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { newPlate } = await req.json();

  const permit = await prisma.permit.findUnique({ where: { id: params.id } });
  if (!permit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (permit.plateChanged) {
    // Enforces "you can only change it once" from the wireframe.
    return NextResponse.json({ error: "Plate has already been changed once." }, { status: 400 });
  }

  const updated = await prisma.permit.update({
    where: { id: params.id },
    data: { licensePlate: newPlate.toUpperCase(), plateChanged: true },
  });

  return NextResponse.json(updated);
}

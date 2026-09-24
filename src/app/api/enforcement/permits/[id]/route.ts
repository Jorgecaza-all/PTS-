import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staffAuth";
import { isPermitCurrentlyValid } from "@/lib/permits";

export const dynamic = "force-dynamic";

// GET /api/enforcement/permits/:id — gate lookup by permit id, e.g. from the QR code
// on the confirmation page (a USB/Bluetooth barcode scanner types the decoded id into
// the lookup field same as a keyboard). Spec 4.5/5: same check regardless of
// permitType — purchased, staff_issued, and dv_exempt are all verified identically
// here, which is what eliminates the reconciliation problem.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const unauthorized = requireStaffAuth(req);
  if (unauthorized) return unauthorized;

  const permit = await prisma.permit.findUnique({
    where: { id: params.id },
    include: { event: true, lot: true },
  });
  if (!permit) {
    return NextResponse.json({ valid: false, error: "No permit found for this code" }, { status: 404 });
  }

  return NextResponse.json({ valid: isPermitCurrentlyValid(permit), permit });
}

"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Confirmation screen — matches the wireframe's "Thank you for your purchase" screen,
// with a QR code encoding the permit id for gate scanning (GATE_ACCESS lots) or
// quick lookup by enforcement staff (OPEN_LOT lots).
export default function ConfirmationPage({ params }: { params: { id: string } }) {
  const [permit, setPermit] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/permits/${params.id}`)
      .then((r) => r.json())
      .then(async (data) => {
        setPermit(data);
        const url = await QRCode.toDataURL(data.id);
        setQrDataUrl(url);
      });
  }, [params.id]);

  if (!permit) return <p className="text-center">Loading...</p>;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h2 className="text-xl font-semibold">Thank you for your purchase!</h2>
      <p>Head to the lot and show this page to the park guard upon entrance to the lot</p>

      {qrDataUrl && <img src={qrDataUrl} alt="Permit QR code" className="w-48 h-48" />}

      <p className="font-medium">
        PLATE {permit.licensePlate} good until {new Date(permit.validUntil).toLocaleString()} in {permit.lot.name}
      </p>
      <p className="text-sm text-gray-600">{permit.event.name}</p>

      <a href={`/confirmation/${permit.id}/change-plate`} className="underline text-sm mt-6">
        Need to change license plate?
      </a>
    </div>
  );
}

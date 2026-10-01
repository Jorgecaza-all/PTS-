// Permit validity window per UT Parking policy: opens 90 minutes before the event
// starts and closes 90 minutes after the event ends.
const BUFFER_MS = 90 * 60 * 1000;

export function permitWindowForEvent(event: { startDate: Date; endDate: Date }): {
  validFrom: Date;
  validUntil: Date;
} {
  return {
    validFrom: new Date(event.startDate.getTime() - BUFFER_MS),
    validUntil: new Date(event.endDate.getTime() + BUFFER_MS),
  };
}

// A permit's stored `status` is only flipped by explicit actions today (there's no
// job that marks it "expired" the moment validUntil passes), so enforcement can't
// trust that field alone — it has to check the time window too.
export function isPermitCurrentlyValid(permit: { status: string; validFrom: Date | string; validUntil: Date | string }): boolean {
  const now = Date.now();
  return (
    permit.status === "active" &&
    new Date(permit.validFrom).getTime() <= now &&
    new Date(permit.validUntil).getTime() > now
  );
}

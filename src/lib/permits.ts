// A permit's stored `status` is only flipped by explicit actions today (there's no
// job that marks it "expired" the moment validUntil passes), so enforcement can't
// trust that field alone — it has to check the time window too.
export function isPermitCurrentlyValid(permit: { status: string; validUntil: Date | string }): boolean {
  return permit.status === "active" && new Date(permit.validUntil).getTime() > Date.now();
}

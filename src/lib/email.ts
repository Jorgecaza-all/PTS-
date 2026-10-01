// Placeholder email sending — UT Parking hasn't given us a mailbox/API to send to
// yet (see spec's open refund-policy question). Swap this for a real provider
// (e.g. Resend, SendGrid) once that's available; nothing else needs to change since
// callers just await sendRefundRequestEmail(...).
export async function sendRefundRequestEmail(details: {
  permitId: string;
  licensePlate: string;
  eventName: string;
  reason: string;
  contact: string;
}) {
  console.log("[MOCK EMAIL] Refund request for the office of parking:", details);
}

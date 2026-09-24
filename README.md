# UT Parking & Transportation Services App — Starter Scaffold

This is a working starting point, not a finished app. It was scaffolded to match
`ut-parking-app-spec.md` (the full product spec — read that first for context on *why*
things are built this way).

## What's already here
- Next.js 14 app-router project, Tailwind for styling
- Prisma schema matching the spec's data model (Lot, Event, EventLot, Permit)
- Seed script with real UT lots/garages (BRG, CCG, ECG, GUG, HCG, MAG, SAG, SJG, SWG, TRG, TSG,
  plus numbered open lots 37/38/39/40/118 and the LHN Longhorn Lot area)
- Core screens matching the original wireframes: plate entry → event list → lot picker
  (when an event has more than one lot) → payment (Stripe, wallet-pay ready) →
  confirmation with QR code → one-time plate change
- DV placard flow: plate + placard number only, no camera/photo step, by design
- Staff admin tool at `/admin` (placeholder password login, NOT for production — see
  `src/lib/staffAuth.ts`): issue staff/comp permits, search/view permits by event or
  plate, and create events (assign lots, set the flat price)
- Enforcement/gate-check tool at `/enforcement` (same placeholder login): look up a
  permit by plate + lot (`OPEN_LOT`) or by permit id (`GATE_ACCESS` QR/barcode scan),
  one path for all three `permitType` values

## Setup
```bash
npm install
cp .env.example .env   # then fill in real values
npx prisma migrate dev --name init
npx prisma db seed     # loads the real lots/garages
npm run dev
```
Then use the admin tool (`/admin`, password from `STAFF_DEV_PASSWORD` in `.env`) to
create an event before exercising the public purchase/DV flows.

## What Claude Code should build next (in rough priority order)
1. ~~Lot selection on the event page~~ — done. Both `events/[id]/page.tsx` (purchase)
   and `events/[id]/dv/page.tsx` fetch the event's lots from `/api/events/[id]` and
   let the user pick one (auto-selected when there's only one).
2. ~~Staff admin tool~~ — done, at `/admin`. Real staff login still needs to be swapped
   in once UT IT provides SSO (Shibboleth/SAML/OAuth) details — see `.env.example`.
3. ~~Enforcement/gate-check flow~~ — done, at `/enforcement`. Validity is computed live
   (`status === 'active'` AND `validUntil` in the future) rather than trusting the
   stored `status` alone, since nothing currently flips it to `expired` on its own.
4. ~~Event management~~ — done, under the "Manage Events" tab in `/admin`.
5. **Deployment packaging** — intentionally not done yet. Per the spec, containerize
   (e.g. Docker) only once the app is fully built and tested end-to-end.

## Security notes for whoever picks this up next
- `POST /api/permits` (the public, unauthenticated route used by the purchase/DV
  flows) only accepts `permitType: 'purchased' | 'dv_exempt'` and verifies a
  `purchased` permit's Stripe `paymentRef` server-side (status + event metadata,
  and rejects reuse) before writing anything. `staff_issued` permits can only be
  created through `POST /api/admin/permits`, which requires the staff session.
- The staff/gate session is a placeholder (see `src/lib/staffAuth.ts`): the browser
  only ever holds a hash of `STAFF_DEV_PASSWORD` in an httpOnly cookie, never the
  password itself. Still not real auth — don't ship it as-is.

## Open items from the spec worth resolving during the build
- Exact permit expiry rule (currently just uses the event's start time — confirm with
  UT Parking whether it should be event end time + a buffer).
- Whether a live reconciliation dashboard is needed for v1, or an after-event report is enough.
- Refund/cancellation policy, if any.
- Whether one plate can hold multiple permits for the same event.
- Whether GATE_ACCESS lots need exit-scanning too (multi-entry garages).

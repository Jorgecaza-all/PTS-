# UT Parking & Transportation Services App — Starter Scaffold

This is a working starting point, not a finished app. It was scaffolded to match
`ut-parking-app-spec.md` (the full product spec — read that first for context on *why*
things are built this way).

## What's already here
- Next.js 14 app-router project, Tailwind for styling
- Prisma schema matching the spec's data model (Lot, Event, EventLot, Permit, RefundRequest)
- Seed script with real UT lots/garages (BRG, CCG, ECG, GUG, HCG, MAG, SAG, SJG, SWG, TRG, TSG,
  plus numbered open lots 37/38/39/40/118 and the LHN Longhorn Lot area)
- Core screens matching the original wireframes: plate entry → event list → lot picker
  (when an event has more than one lot) → Stripe-hosted Checkout (card/Apple Pay/Google
  Pay/Link) → confirmation with QR code → one-time plate change → self-service refund
  request
- DV placard flow: plate + placard number only, no camera/photo step, by design
- Staff admin tool at `/admin` (placeholder username/password login, NOT for
  production — see `src/lib/staffAuth.ts`): issue staff/comp permits, search/view
  permits by event or plate, create events (assign lots, set the flat price), and
  view self-service refund requests
- Enforcement/gate-check tool at `/enforcement` (same placeholder login): look up a
  permit by plate + lot (`OPEN_LOT`) or by permit id (`GATE_ACCESS` QR/barcode scan),
  one path for all three `permitType` values, with entry/exit scan buttons for
  `GATE_ACCESS` lots

## Setup
```bash
npm install
cp .env.example .env   # then fill in real values
npx prisma migrate dev --name init
npx prisma db seed     # loads the real lots/garages
npm run dev
```
Then log into the admin tool (`/admin` — username/password from `STAFF_DEV_USERNAME`/
`STAFF_DEV_PASSWORD` in `.env`, default `longhorn` / `123`) and use "Manage Events" to
create an event before exercising the public purchase/DV flows.

### Stripe setup
Needs `STRIPE_SECRET_KEY` (test mode) and `STRIPE_WEBHOOK_SECRET` — see `.env.example`.
Locally, run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and use the
`whsec_...` it prints. In production, point a Stripe Dashboard webhook endpoint at
`/api/stripe/webhook` listening for `checkout.session.completed` (and, for completeness,
`checkout.session.async_payment_succeeded`) and use that endpoint's signing secret.
Pay always redirects to Stripe-hosted Checkout; the permit is created by the webhook,
never by the browser redirect — see `/api/stripe/webhook` and `/api/stripe/create-checkout-session`.

## What Claude Code should build next (in rough priority order)
1. ~~Lot selection on the event page~~ — done.
2. ~~Staff admin tool~~ — done, at `/admin`. Real staff login still needs to be swapped
   in once UT IT provides SSO (Shibboleth/SAML/OAuth) details — see `.env.example`.
   The current placeholder is username/password (`longhorn` / `123` by default), not
   just a password, to make it read more like a real sign-in while demoing.
3. ~~Enforcement/gate-check flow~~ — done, at `/enforcement`, including GATE_ACCESS
   entry/exit scanning (see "Open items" below).
4. ~~Event management~~ — done, under the "Manage Events" tab in `/admin`.
5. **Deployment packaging** — intentionally not done yet. Per the spec, containerize
   (e.g. Docker) only once the app is fully built and tested end-to-end.
6. ~~Stripe Checkout~~ — done. Pay redirects to Stripe-hosted Checkout
   (`/api/stripe/create-checkout-session`); the permit is created only by a
   signature-verified webhook (`/api/stripe/webhook`), never by the browser redirect.
   Webhook signature verification, dedup, and permit creation are verified locally
   (self-signed test events — see commit history); `checkout.sessions.create`/
   `retrieve` themselves need a real network path to Stripe to test, which this sandbox
   doesn't have — exercise those for real once deployed, using the checklist below.
7. **Real email for refund requests** — `src/lib/email.ts` is a console.log stub (see
   "Open items" below). Swap in a real provider (Resend, SendGrid, etc.) once UT
   Parking gives us a mailbox/API to send to.

## Security notes for whoever picks this up next
- `POST /api/permits` (the public, unauthenticated route) only ever creates
  `dv_exempt` permits now. `purchased` permits are created exclusively by the
  signature-verified Stripe webhook; `staff_issued` only via `POST /api/admin/permits`,
  which requires the staff session. No client request can mint a `purchased` permit.
- `Permit.paymentRef` is a unique DB column, so a retried/duplicate webhook delivery
  for the same payment can never create a second permit (checked first, and the
  unique constraint backstops any race).
- The staff/gate session is a placeholder (see `src/lib/staffAuth.ts`): the browser
  only ever holds a hash of the username+password in an httpOnly cookie, never the
  credentials themselves. Still not real auth — don't ship it as-is.
- Card numbers/CVC never touch this app — Stripe Checkout collects them on Stripe's
  own hosted page.

## Open items from the spec — now resolved (per UT Parking's direction)
- **Permit expiry rule**: resolved. A permit is valid from 90 minutes before the
  event's start time through 90 minutes after its end time (`src/lib/permits.ts`,
  `permitWindowForEvent`). This required adding `Event.endDate` and `Permit.validFrom`
  — events previously only had a single start timestamp.
- **Refund/cancellation policy**: resolved. There's a self-service refund *request*
  flow mirroring the plate-change flow (`/confirmation/[id]/refund`) — it doesn't
  refund automatically, it records the request (`RefundRequest` model) and notifies
  the office of parking, which decides. Notification is currently a stub
  (`src/lib/email.ts` console.logs it and staff can see all requests under the
  "Refund Requests" tab in `/admin`) until UT Parking provides a real mailbox/API.
- **Multiple permits per plate**: resolved. A plate can hold permits for multiple
  different events/time windows (e.g. a 1–4pm event and a separate 5–10pm event) —
  these are separate transactions against separate lots, so nothing prevents it. (A
  plate holding two permits for the *same* event is still unconstrained; revisit if
  that turns out to need a block.)
- **GATE_ACCESS exit-scanning**: resolved — yes. One scan in, one scan out, no
  re-entry. `POST /api/enforcement/permits/:id/scan` with `direction: "in" | "out"`
  enforces this (can't scan out before in, can't scan either twice) and the
  `/enforcement` permit-id lookup shows Scan In/Scan Out buttons for `GATE_ACCESS`
  permits. `OPEN_LOT` permits are unaffected — they're still checked by plate
  presence, not scanned.
- **Live reconciliation dashboard**: still open — not addressed. The admin "Search
  Permits" and "Refund Requests" tabs give staff a manual lookup, but there's no
  sold-vs-scanned live view. Worth a decision on whether v1 needs it or an
  after-event report is enough.

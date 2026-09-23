# UT Parking & Transportation Services App — Starter Scaffold

This is a working starting point, not a finished app. It was scaffolded to match
`ut-parking-app-spec.md` (the full product spec — read that first for context on *why*
things are built this way).

## What's already here
- Next.js 14 app-router project, Tailwind for styling
- Prisma schema matching the spec's data model (Lot, Event, EventLot, Permit)
- Seed script with real UT lots/garages (BRG, CCG, ECG, GUG, HCG, MAG, SAG, SJG, SWG, TRG, TSG,
  plus numbered open lots 37/38/39/40/118 and the LHN Longhorn Lot area)
- Core screens matching the original wireframes: plate entry → event list → payment
  (Stripe, wallet-pay ready) → confirmation with QR code → one-time plate change
- DV placard flow: plate + placard number only, no camera/photo step, by design
- Staff admin page stub with a placeholder password login (NOT for production)

## Setup
```bash
npm install
cp .env.example .env   # then fill in real values
npx prisma migrate dev --name init
npx prisma db seed     # loads the real lots/garages
npm run dev
```

## What Claude Code should build next (in rough priority order)
1. **Lot selection on the event page** — several `TODO: REPLACE_WITH_SELECTED_LOT_ID`
   markers exist in `events/[id]/page.tsx` and `events/[id]/dv/page.tsx`. An event can
   have multiple lots/garages (all at the same flat price per the spec) — add a lot picker.
2. **Staff admin tool** — build out `admin/page.tsx`: issue a `staff_issued` permit
   against a plate/event, and search/view permits by event or plate. Keep the placeholder
   password login until UT IT provides real SSO (Shibboleth/SAML/OAuth) details — see
   `.env.example` for where those will go.
3. **Enforcement/gate-check flow** — a simple lookup (by plate or QR scan) that checks
   `Permit.status === 'active'` for the given lot/event. Same lookup path for all three
   `permitType` values — that's what eliminates the reconciliation problem this app exists
   to solve.
4. **Event management** — currently events/lots are only seeded manually. Staff will need
   a way to create events, assign lots, and set the flat price.
5. **Deployment packaging** — intentionally not done yet. Per the spec, containerize
   (e.g. Docker) only once the app is fully built and tested end-to-end.

## Open items from the spec worth resolving during the build
- Exact permit expiry rule (currently just uses the event's start time — confirm with
  UT Parking whether it should be event end time + a buffer).
- Whether a live reconciliation dashboard is needed for v1, or an after-event report is enough.
- Refund/cancellation policy, if any.
- Whether one plate can hold multiple permits for the same event.
- Whether GATE_ACCESS lots need exit-scanning too (multi-entry garages).

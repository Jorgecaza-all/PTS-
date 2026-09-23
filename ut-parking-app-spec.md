# UT Parking & Transportation Services — Event Parking App
### Product Spec (for build handoff to Claude Code)

## 1. Problem Statement
UT currently uses ParkMobile (a third-party) for event parking payments, while UT staff separately issue permits (comps, staff/student passes, exemptions). This creates two disconnected systems that must be manually reconciled after every event to count total permits sold vs. scanned. Additional pain points:

- ParkMobile forces repeated card entry and account creation, which frustrates users — especially older attendees — leading to abandoned payments and long entry lines.
- ParkMobile does not allow correcting a mistyped license plate at time of payment, forcing staff to issue manual exemptions, which then also need reconciling.
- DV (disabled) placard holders currently get a printed paper permit placed on their windshield by staff, which is manual, wasteful, and yet another thing to reconcile.

## 2. Goal
Replace ParkMobile for UT events with a UT-owned app where **every permit — purchased, staff-issued, or DV-exempt — lives in one system**, eliminating manual reconciliation, while making payment dramatically easier than ParkMobile.

## 3. Core Principle
One database, one source of truth. Every permit record has a `type` field:
- `purchased` — paid through the app
- `staff_issued` — comp/exemption granted by UT staff
- `dv_exempt` — disabled placard self-attested

All three are scanned/verified the same way by gate staff, from the same table. No cross-system counting.

## 4. User Flows (based on existing wireframes)

### 4.1 Entry flow
1. **Landing** — user enters license plate → GO
2. **Event list** — shows upcoming events with date, time, and assigned lot(s) (e.g. "Bass Concert Hall - Sep 24 5:00PM Lot 37,39,38")
3. **Event detail / payment** — shows event name, collects Name + Credit Card Number → GO
4. **Confirmation** — "Thank you for your purchase", instructions to show page (or QR code) to the gate guard, plate validity window + lot(s), event date/time/name
5. **Plate correction** (from confirmation page) — "Need to change license plate?" → new plate field, one-time-only warning → Confirm → returns to confirmation page with updated plate

### 4.2 DV plate flow (new)
1. From event detail screen, an option: "I have a DV placard"
2. User enters: license plate + DV placard/permit number (self-attestation, no live DMV check for v1)
3. Confirmation screen — same layout as purchase confirmation, but no charge, labeled clearly as a DV pass
4. Same one-time plate-correction option applies
5. Record saved as `type: dv_exempt` in the same permits table

No photo upload, no camera step, no extra verification screen — target users skew older and any added step risks losing them at the exact friction point this app is meant to remove. Self-attestation via plate + placard number only, full stop.

### 4.3 Payment requirements
- Support **Apple Pay / Google Pay** as one-tap options — this is the single biggest lever against ParkMobile's friction.
- Support standard card entry with **optional save-for-next-time** using a payment token (e.g. Stripe Customer + SetupIntent) — **without forcing account/login creation**. Recognize returning users by device or a lightweight phone-number lookup, not a mandatory signup wall.
- Keep the form to exactly what's in the wireframe: Name, Card Number (or wallet button) — no extra required fields, since minimizing steps is what will actually get older/less tech-savvy users through checkout.

### 4.4 Staff-issued permits (comp/exemption)
- Staff-facing admin view (separate from the public app) where staff can issue a permit directly against a plate for a given event — writes to the same permits table with `type: staff_issued`.
- Eliminates the current "issue paper exemption, reconcile later" loop mentioned for plate-correction cases — since plate correction is now self-service in the public app, this exemption path should mostly go away for that use case, and remain only for genuine comps.
- **Staff login is tied to UT's existing single sign-on system** — the same login staff/faculty already use for Canvas and other campus tools (commonly Shibboleth or a SAML/OAuth-based identity provider at most universities). This is not something to build in isolation: it requires connection details (client ID/secret, metadata, or equivalent) from UT's IT/identity team before the admin login screen can be wired up for real. Build the admin view with a placeholder/simple login first so development and testing aren't blocked, then swap in the real SSO connection once UT IT provides access.

### 4.5 Gate scanning / verification
- Gate staff scan the QR code (or search by plate) and see: permit type, plate, event, valid lot(s), valid-until time — pulled from the single permits table regardless of how the permit originated.

## 5. Data Model (draft)

Lots come in two access types, which change what happens after payment:
- **`OPEN_LOT`** — no physical gate. Payment just marks the plate as paid/valid for that lot; enforcement staff walk the lot and check plates against the system (or scan the confirmation QR if the driver has it handy). Covers UT's **Longhorn Lots** (abbreviated **LHN** on maps/signage — open to any UT permit) and **C Lots** (surface lots normally restricted to C/C+ permit holders, opened up for event parking). Individual numbered lots (e.g. 37, 38, 39, 40, 118) fall under this category.
- **`GATE_ACCESS`** — a physical gate arm (UT's parking garages). Payment generates a QR code required to lift the gate at entry.

**Real UT garage codes (from the campus parking map — note: this map may be outdated, confirm full current list with UT Parking & Transportation before finalizing)**:
- BRG — Brazos Garage
- CCG — Conference Center Garage
- ECG — East Campus Garage *(not on this map copy, but confirmed to exist)*
- GUG — Guadalupe Garage
- HCG — Health Center Garage *(not on this map copy, but confirmed to exist)*
- MAG — Manor Garage
- SAG — San Antonio Garage
- SJG — San Jacinto Garage
- SWG — Speedway Garage
- TRG — Trinity Garage
- TSG — 27th Street Garage

**Other confirmed abbreviations seen on maps/signage:**
- **LHN** — Longhorn Lots (the general open-lot category above, not a single garage)
- **DMN** — Dedman, referring to Robert Dedman Dr — likely labels a lot/area along that road; confirm exact lot boundary with UT Parking if event parking is planned there

Note: garages otherwise follow UT's normal daily rules (e.g. first 30 minutes free, C+ permit holders get evening/weekend access) — event parking would layer on top of or temporarily override those rules for the event window, worth confirming with UT Parking & Transportation how event pricing should interact with the existing daily fee structure in each garage.

```
Lot {
  id
  name                      // e.g. "SJC Garage", "Lot 37"
  access_type: 'OPEN_LOT' | 'GATE_ACCESS'
}

Permit {
  id                        // also encoded into the QR for GATE_ACCESS lots
  license_plate
  permit_type: 'purchased' | 'staff_issued' | 'dv_exempt'
  event_id
  lot_id
  name_on_permit
  valid_until (timestamp)
  plate_changed: boolean    // true after the one-time change is used
  payment_ref (nullable)    // Stripe charge/customer id, null for staff/dv
  dv_placard_number (nullable)
  status: 'active' | 'expired'
  created_at
  updated_at
}

Event {
  id
  name
  date
  time
  price                     // flat fee for this event, applies to every lot/garage listed below
  lots: string[]            // e.g. ["Lot 37", "Lot 38", "Lot 39", "SJC Garage"] — all charged the same event price
}
```

**Enforcement check logic:**
- `OPEN_LOT`: officer/staff enters or scans a plate → system checks "is there an active Permit for this plate at this lot right now?"
- `GATE_ACCESS`: gate scanner reads the QR → system looks up the Permit by its ID → if active, opens the gate.

Both paths query the same `Permit` table regardless of `permit_type`, so purchased, staff-issued, and DV-exempt permits are all checked identically — this is what eliminates the reconciliation problem.

## 6. Screens to Build
1. License Plate entry
2. Event list
3. Event detail + payment (card or Apple Pay/Google Pay)
4. DV placard entry (new)
5. Confirmation (with QR code)
6. Plate change (one-time, with confirmation modal)
7. Staff admin: issue permit, view/search permits by event or plate (basic internal tool)

## 7. Suggested Tech Stack (for Claude Code)
- **Frontend:** Next.js (React) + Tailwind — mobile-first, since most users will be on phones at the lot entrance
- **Backend:** Next.js API routes or a lightweight Node/Express service + Postgres
- **Payments:** Stripe (supports Apple Pay/Google Pay via Payment Request Button, and saved payment methods without forcing full account creation)
- **QR codes:** generated server-side per permit (e.g. `qrcode` npm package), encoding a permit ID staff can scan/look up
- **Auth:** none required for public users (guest flow by design); simple staff login for the admin view

## 8. Open Questions / Decisions Needed
- Do staff need real-time reconciliation dashboards (e.g. permits sold vs. scanned, live during an event) as part of v1, or is the single-table model itself sufficient for now?
- Any existing UT system (student/staff ID database) DV placards should cross-check against, or fully self-attested for v1 per current direction (current decision: fully self-attested, plate + placard number only)?

## 9. Design Priority
Every screen should be judged against one question: **could an older, non-tech-savvy person get through this in a parking lot without help?** That means: minimal required fields, no accounts, no cameras, no multi-step verification, large tappable buttons, and wallet-pay (Apple Pay/Google Pay) surfaced as the fastest option every time it's available.

## 10. Deployment & Licensing Model (later stage — not a blocker for building/testing now)
Long-term goal: package this as **self-hosted, licensed software** — UT runs it on their own servers, but only the developer can modify or update it. This is the standard "on-prem enterprise software" model (similar to how Jira Server or many POS/university systems are sold): UT gets a sealed, runnable package; the source code and the ability to edit it stay with the developer.

This does **not** need to be built now. Packaging (e.g. into a Docker container) is a final step done once the app works end-to-end — build and test normally first. The only thing to build correctly from the start, so this later step is painless: keep all secrets/settings (database credentials, Stripe keys, etc.) in a config/environment file rather than hardcoded in the app's code. Everything else about containerization and licensing terms can be figured out after testing is complete.

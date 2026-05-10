# Fireproof — Demo Walkthrough

A 9-step walk through the Cedar Heights scenario. Should take three minutes.
Sign in as `lpark@beacon.example` (Linda Park, Beacon's office manager — the
one person in the packet who knows what's actually missing).

Each step lists the operational meaning, the exact UI action, and the
screenshot in `docs/screenshots/` it corresponds to.

---

## 1. Open the Cedar Heights dashboard

Linda lands on Beacon's portfolio. Cedar Heights Apartments shows five open
exceptions: one impairment, two deficiencies, one carrier recommendation, one
asset-identity mismatch. Each is a separate stateful record — not a row on a
generic deficiency PDF.

- **Action**: Click **Cedar Heights Apartments**.
- **Screenshot**: `docs/screenshots/01-property-dashboard.png`

## 2. Open the Day -116 sprinkler impairment

The frozen-pipe repair on the 9th-floor wet sprinkler vertical riser. The
exception state is `restored_evidence_incomplete`: the system is physically
back online, but the record isn't audit-ready. The header timeline shows
opened Day -116 at 07:40, restored Day -116 around 13:30. Duration: 5 hours
50 minutes.

- **Action**: Click the exception titled **9th-floor wet sprinkler zone out of
  service for frozen-pipe repair**.
- **Screenshot**: `docs/screenshots/02-impairment-detail.png`

## 3. Read the rule summary (Hartwell, > 4 hours)

The right-side rule panel cites `hartwell.impairment.gt4h.v1`: any
water-based impairment lasting more than 240 minutes requires AHJ
notification, fire-watch record, and a restoration test with numeric
readings. The evidence checklist shows three blockers unsatisfied:

- `ahj_notification` — recorded as **unknown** in the handwritten log
- `fire_watch_record` — Carlos was present, but no signed log or invoice on file
- `restoration_test_record` — only "pressure good" exists, no numeric readings

- **Action**: Scroll to the **Required evidence** panel.
- **Screenshot**: `docs/screenshots/03-rule-summary.png`

## 4. Try to close it (the climax)

Linda clicks **Request close**. The API runs `EvidenceValidationService.validateForClose`
through `ExceptionLifecycleService.transition` and returns 422. The UI surfaces
the three blockers as red callouts. This is the moment the existing tools
flatten — Fireproof refuses.

- **Action**: Click **Request close → Closed (audit-ready)**.
- **Expected response (verbatim)**:

```http
POST /v1/exceptions/exc_imp_0116/transition HTTP/1.1
Content-Type: application/json

{ "to_state": "closed_audit_ready" }
```

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "error": "BLOCKING_REQUIREMENTS_UNMET",
  "exceptionId": "exc_imp_0116",
  "missing": [
    "ahj_notification.valid",
    "fire_watch_record.valid",
    "restoration_test_record.valid"
  ]
}
```

- **Screenshot**: `docs/screenshots/04-blocking-422.png`

## 5. Open the contradiction map

Switch to the property's **Contradictions** view. Three Cedar Heights conflicts
should be visible:

- **Standpipe omission** — Quarterly ITM (Day -211) marks the 9th-floor west
  stairwell hose connection satisfactory; the internal Linda↔Tom email thread
  (Day -78) acknowledges visible corrosion that was probably present "last
  quarter." Same property, same component, conflicting status claims with
  overlapping period.
- **Battery identity** — Continental loss-control survey (Day -416) records the
  installed battery as Eagle-Picher Carefree CFM12V18; Beacon's ITM record of
  reference shows a different manufacturer/model. Asset-identity mismatch.
- **Pump variance** — Day -387 annual performance test on file says
  satisfactory; Day +6 independent test shows 18% churn pressure differential.
  Performance variance over time outside tolerance.

- **Action**: Click **Contradictions** in the left rail.
- **Screenshot**: `docs/screenshots/05-contradictions.png`

## 6. Build the AHJ NOV response packet

Marshal Reyes's Day +12 Notice of Violation has a 30-day deadline. Linda
opens the packet builder, picks the AHJ NOV response template, and the system
auto-bundles: cover memo, exception timeline, evidence index, deficiency
correspondence, contradiction log. Missing items are listed before generation
so Linda knows what's still soft. She generates anyway — the manifest will
record exactly what was and wasn't included.

- **Action**: Click **Generate packet → AHJ NOV Response**.
- **Screenshot**: `docs/screenshots/06-packet-builder.png`

## 7. Inspect the immutable vault

Open the property vault. Each original document shows its SHA-256 checksum,
version number, uploader, and `is_original = true` badge. The Day -116
handwritten log, the Day -78 email thread, the Day -416 carrier survey — all
content-addressed, all immutable. Supplements append new versions; they do
not overwrite.

- **Action**: Click **Vault** in the left rail.
- **Screenshot**: `docs/screenshots/07-vault.png`

## 8. Apply a legal hold

Worth, Patel & Associates has issued a preservation demand. Linda creates a
legal hold scoped to Cedar Heights with reason "Continental Mutual subrogation
preservation — Worth, Patel demand letter, Day +9." Every original under the
hold now refuses overwrite/delete; the vault badges flip to a hold indicator.
Any future deletion path returns `LEGAL_HOLD_ACTIVE`.

- **Action**: From the property page, click **Apply legal hold**.
- **Screenshot**: `docs/screenshots/08-legal-hold.png`

## 9. Read the generated packet manifest and audit trail

Open the packet from step 6. The `manifest.json` shows every included
document version with its hash, the contradictions referenced, the packet
type, the actor, the timestamp, and the active legal hold. The audit feed on
the property timeline shows a `packet.emitted` event paired with
`legal_hold.applied` — every export is itself a record.

- **Action**: Click **Download manifest** on the generated packet, then
  return to the property timeline.
- **Screenshot**: `docs/screenshots/09-manifest-and-audit.png`

---

## What this demo deliberately doesn't show

- **Async packet generation.** The MVP generates packet bundles inline so the
  demo never waits on a worker. The BullMQ worker exists in `apps/worker/` for
  the production path.
- **Real S3 Object Lock.** The dev storage adapter is content-addressed local
  FS that refuses overwrite when a hold is active. The MinIO Object Lock
  config in `infrastructure/` is the production substrate.
- **Real notifications.** AHJ/customer/insurer notification dispatch is
  log-only in the demo; the proof-of-notification capture flow is real.
- **Offline sync.** The PWA registers a service worker and persists drafts to
  IndexedDB, but the demo runs online.

These are honest gaps. The wedge — rule-driven evidence gating that blocks
invalid closure — is fully wired and exercised end-to-end in step 4.

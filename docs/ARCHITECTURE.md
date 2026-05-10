# Fireproof — Architecture

For the reviewer who wants to know how the prototype is wired without reading
the whole codebase. ~90 seconds of reading.

## Monorepo layout

pnpm workspaces + Turbo. Node 20+, TypeScript strict, ES2022.

```
apps/
  web/                Next.js 15 App Router PWA (React 19)
  api/                Fastify REST API (system of record)
  worker/             BullMQ worker — built, not on the demo's critical path
packages/
  domain/             Zod schemas, enums, state machines, error codes
  db/                 Drizzle schema + migrations (Postgres)
  rules/              Rule pack engine (Hartwell / Wessex / Dunmoor)
  legal-export/       Contradiction engine + packet manifest builder
  ui/                 Shared React components
  seed/               Cedar Heights demo data (deterministic UUIDv5 IDs)
infrastructure/       docker-compose, Dockerfiles (api/web/worker), GH Actions
```

## Stack

- **Web**: Next.js 15 (App Router), React 19, Serwist PWA, TanStack Query,
  Zustand, react-hook-form, idb-keyval for offline drafts.
- **API**: Fastify, Drizzle ORM, Postgres. REST is the source of record.
  Every state-changing operation goes through the API — workers and the web
  client do not write directly.
- **Worker**: BullMQ on Redis. Built for async packet generation and
  notification dispatch. **The MVP runs packet generation inline through the
  API** so the reviewer demo never depends on a background process. The
  worker is wired and runnable; it is not on the critical path.
- **Storage**: content-addressed local filesystem adapter in dev (`.storage/`)
  that simulates S3 Object Lock WORM semantics. MinIO Object Lock config
  lives in `infrastructure/` for the production path.
- **Packet generation**: pdf-lib for cover memos and summaries, archiver for
  ZIP bundling, deterministic `manifest.json` and `manifest.csv`.

## Key domain choices

- **`exception_state_history` is append-only.** Every transition writes a
  history row; `closed_audit_ready` is itself an immutable closure record.
- **`document_versions` are immutable.** Each upload gets a SHA-256, a
  version number, and `is_original = true|false`. Corrections create new
  versions with `supersedes_version_id`; originals are never overwritten.
- **States are pgEnums**, not strings. State transitions go through
  `isAllowedTransition` from `@fireproof/domain/transitions`. Invalid
  transitions throw `INVALID_STATE_TRANSITION`. Close transitions also call
  `EvidenceValidationService.validateForClose`, which throws
  `BLOCKING_REQUIREMENTS_UNMET` (HTTP 422) on missing evidence — this is the
  wedge.
- **Rules are jurisdiction-versioned.** `rule_packs` carry `effective_from`,
  `effective_to`, and a `confidence` band. Hartwell ships high-confidence with
  the `> 4 hours` impairment-notification rule; Wessex is medium-confidence
  with the AHJ-notification block intentionally left unspecified; Dunmoor is
  low-confidence with all local amendments disabled until verified. This
  models the packet's real three-layer regulatory stack rather than pretending
  one rule fits every jurisdiction.
- **Seed IDs are deterministic UUIDv5.** Slugs like `usr_lpark`, `prop_cedar`,
  `exc_imp_0116` map to stable UUIDs via a namespace. Seeds are idempotent
  and the demo URLs do not change between resets.
- **Branded IDs throughout.** `BrandedId<'Exception'>` etc. prevent
  cross-entity ID confusion at the type level.
- **Legal holds win.** An active hold scoped to a property/exception/document
  blocks deletion and supersession with `LEGAL_HOLD_ACTIVE`. Every export
  manifest records whether a hold was active at generation time.
- **Audit everything.** Every state transition, evidence change, hold change,
  and packet emission writes to `audit_events` with actor + before/after.

## What's intentionally inline vs. queued

| Operation | MVP | Production path |
|---|---|---|
| State transition + evidence validation | inline (API) | inline (it must be — it's the wedge) |
| Rule evaluation snapshot | inline on create + on demand | inline; cached snapshot per exception |
| Contradiction detection | seeded as fixtures, deterministic engine wired | worker-driven recompute on document upload |
| Packet generation (PDF + ZIP + manifest) | **inline** through `PacketService.create` | BullMQ job (`apps/worker/`) — already built |
| Notification dispatch | log-only | worker + provider integration |

The choice to inline packet generation for the demo is deliberate: the
reviewer should never see a "queued / pending" state. The async worker exists
because in production the packet job belongs in a queue, not because the
demo needs it.

## What's a stub

- **S3 Object Lock**: dev uses a local FS adapter that refuses overwrite when
  a version is original and an active hold scopes it. The MinIO Object Lock
  configuration in `infrastructure/` is real but not on the demo path.
- **Email / SMS / fax notifications**: the proof-of-notification *capture*
  flow is real — recipient, channel, timestamp, copy, signed log. Outbound
  *dispatch* is log-only in the demo.
- **Auth**: dev mode trusts an email-only login. Real auth (OIDC, MFA per
  the personas table) is a deployment concern, not a wedge concern.
- **AHJ portal integrations**: out of scope. The packet ZIP is the export
  surface; whoever consumes it (PDF, email, portal upload) lives outside the
  prototype.

## How the demo's 422 actually fires

Roughly:

1. The web client `POST`s `/v1/exceptions/exc_imp_0116/transition` with
   `{ to_state: "closed_audit_ready" }`.
2. `ExceptionLifecycleService.transition` (in `apps/api/src/services/`) loads
   the exception, checks `isAllowedTransition('impairment',
   'restored_evidence_incomplete', 'closed_audit_ready')` — allowed.
3. Because the target state is in `CLOSE_STATES`, it calls
   `EvidenceValidationService.validateForClose`, which:
   - loads the exception's active rule evaluation;
   - reads `blocking_requirements` from the rule pack;
   - checks each requirement against `evidence_items.status = 'valid'`;
   - returns `{ ok: false, missing: [...] }` if any blocker is unmet.
4. The service throws `blockingRequirementsUnmet(missing, { exceptionId })`,
   which the Fastify error handler maps to HTTP 422 with the JSON body shown
   in `docs/DEMO.md` step 4.

Read the file at `apps/api/src/services/ExceptionLifecycleService.ts:151–161`
if you want the exact lines.

## Why this isn't bigger than it needs to be

The packet describes a six-broken-tools workflow, but the wedge is one rule:
*you cannot close an exception that does not have its required evidence.*
Everything in this repo — the state machines, the rule packs, the immutable
vault, the legal hold, the packet builder — exists to make that single rule
defensible against an AHJ, a carrier, a subrogation attorney, and Beacon's
own E&O carrier all asking the same property's records on the same week.

The infrastructure surface (Dockerfiles, GH Actions, MinIO, BullMQ) is here
because if the substrate isn't trustworthy the wedge isn't either. It is
not the demo. The demo is one 422.

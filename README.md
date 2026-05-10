# The system Beacon should have had

A working prototype answering the **Recover Systems** take-home built around
Beacon Fire & Safety and the Cedar Heights fire. This is not a startup pitch.
It is one defensible answer to the case-study question — *what is broken
about the system such that any contractor operating this way would eventually
produce this outcome* — built far enough to demonstrate the wedge in code
against the actual artifacts in the packet.

The wedge, in one sentence: **turn every impairment, deficiency, carrier
recommendation, and asset-identity mismatch into a stateful record with
rule-driven evidence requirements that physically block invalid closure.**

The full argument is in [`SUBMISSION.md`](./SUBMISSION.md). This README is
the demo guide. The product label "Fireproof" is a working name for the
prototype, not a company.

## The moment of impact

When the Beacon office manager (L. Park) tries to close the Day -116 ninth-floor
sprinkler impairment without numeric main-drain readings, AHJ notification
proof, and a signed fire-watch log, the API refuses:

```
POST /v1/exceptions/exc_imp_0116/transition
{ "to_state": "closed_audit_ready" }

HTTP/1.1 422 Unprocessable Entity
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

That's the wedge. Routine ITM software lets you check a box and move on
("pressure good," and the impairment is closed). Fireproof refuses until the
record is actually defensible. Every other capability in this repo —
contradiction detection, packet builder, immutable vault, legal hold — exists
to reinforce that one moment.

## See it in 30 seconds

- **Live (hosted)**: see [`docs/DEPLOY.md`](./docs/DEPLOY.md) — one
  Render blueprint deploys API + Postgres + web.
- **Screenshots** of the demo flow: [`docs/screenshots/`](./docs/screenshots/)
- **Demo script** (9 steps, ~3 minutes): [`docs/DEMO.md`](./docs/DEMO.md)
- **Submission report**: [`SUBMISSION.md`](./SUBMISSION.md)
- **Architecture for the curious**: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

## Two ways to run it

Both produce the same demo. Pick whichever the reviewer prefers.

### A. Hosted (Render blueprint, one click)

Push the repo to GitHub, connect it to Render as a Blueprint, click Apply.
The committed `render.yaml` provisions Postgres, the API, and the web
service in one pass. Full walkthrough in [`docs/DEPLOY.md`](./docs/DEPLOY.md).

### B. Local (six commands)

Postgres via `brew services start postgresql@17` (or `docker compose up -d
postgres`), then:

```bash
pnpm install
psql postgres -c "CREATE USER fireproof WITH PASSWORD 'fireproof';"
psql postgres -c "CREATE DATABASE fireproof OWNER fireproof;"
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm --filter @fireproof/domain build
pnpm --filter @fireproof/rules build
pnpm --filter @fireproof/legal-export build
pnpm dev                    # api on :4000, web on :3000
```

Open <http://localhost:3000/login>, sign in as `lpark@beacon.example`
(no password — dev auth), and follow [`docs/DEMO.md`](./docs/DEMO.md).

## What's in here

The repo is a pnpm + Turbo monorepo. The interesting paths for a reviewer:

| Path | What lives there |
|---|---|
| `apps/api/src/services/ExceptionLifecycleService.ts` | The 422-on-close logic. This is the wedge in code. |
| `apps/api/src/services/PacketService.ts` | Synchronous packet bundle generation (PDF + ZIP + manifest). |
| `packages/rules/` | Jurisdiction-versioned rule packs (Hartwell / Wessex / Dunmoor). |
| `packages/legal-export/` | Contradiction engine + packet manifest builder. |
| `packages/seed/` | Cedar Heights canonical demo data, deterministic UUIDv5 IDs. |
| `apps/web/` | Next.js 15 + React 19 PWA. |

Curious-reviewer surface (not on the demo's critical path, but real):

- `apps/worker/` — BullMQ worker built for async packet generation; the MVP
  runs packet generation inline through the API for demo reliability.
- `infrastructure/` — docker-compose, GitHub Actions CI, Dockerfiles for
  api/web/worker, and MinIO Object Lock config.
- `.storage/` (gitignored) — local content-addressed FS adapter that
  simulates S3 Object Lock WORM semantics in dev.

Set expectations honestly: the BullMQ worker, MinIO Object Lock, and CI
workflows exist because the wedge survives only if the data substrate is
trustworthy. They are not the demo. The demo runs synchronously through the
API and that is intentional — see `docs/ARCHITECTURE.md` for the
inline-vs-queued choice.

## Repo conventions

See [`CLAUDE.md`](./CLAUDE.md) for contributor rules (types from
`@fireproof/domain`, REST is the source of record, originals are immutable,
legal holds win).

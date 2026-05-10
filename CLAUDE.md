# Fireproof — Contributor Guide

This is a TypeScript monorepo using pnpm workspaces and Turbo. Every package targets Node 20+, ES2022, strict TS, bundler module resolution.

## Where work lives

- `apps/web/` — Next.js 15 App Router PWA (frontend agent)
- `apps/api/` — REST API, Drizzle, Postgres (backend agent)
- `apps/worker/` — BullMQ / pg-boss workers (legal & export agent)
- `packages/domain/` — shared Zod schemas, enums, state machines, error codes
- `packages/rules/` — rule pack engine (rules agent)
- `packages/legal-export/` — packet generation (legal/export agent)
- `packages/seed/` — demo data (seed agent)
- `packages/ui/` — shared React components (frontend agent)
- `infrastructure/` — docker-compose, IaC, deploy (infra agent)

## Non-negotiable rules

1. **Types come from `@fireproof/domain`.** Import enums, schemas, error codes, and state-machine helpers from this package. Do not redefine them.
2. **Do not duplicate enums.** If a value is already in `packages/domain/src/enums.ts` or `states.ts`, reuse it.
3. **REST is the source of record.** All state-changing operations go through `apps/api`. Workers and the web app must call the API rather than mutating the database directly.
4. **Originals are immutable.** Never overwrite a `document_versions` row or its underlying object in S3. New facts always create a new version with `supersedes_version_id` set.
5. **State transitions must use `isAllowedTransition`** from `@fireproof/domain/transitions`. Reject any transition not present in the allowed map; throw `INVALID_STATE_TRANSITION`.
6. **Wire dates as ISO 8601 strings.** Schemas in `@fireproof/domain` already enforce this via `z.string().datetime()`. Keep DB columns as `timestamptz`.
7. **IDs are branded strings** (UUID v4). Use `BrandedId<'Exception'>` etc. — see `packages/domain/src/schemas/_branded.ts`.
8. **Legal holds win.** If a document or exception is under an active hold, deletion / supersession is forbidden — throw `LEGAL_HOLD_ACTIVE`.
9. **Blocking requirements gate transitions.** A transition into a "closed_*" or evidence-pending state must check rule evaluations; throw `BLOCKING_REQUIREMENTS_UNMET` if any blocking requirement is unsatisfied.
10. **Audit everything.** Every state change, evidence change, hold change, and packet emission appends to `audit_events`.

## Commands

- `pnpm dev` — run apps in parallel
- `pnpm typecheck` — strict TS across workspace
- `pnpm lint` — ESLint
- `pnpm test` — package-level tests
- `pnpm db:migrate` / `pnpm db:seed` — database lifecycle

## Adding a new entity or schema

1. Add the Zod schema in `packages/domain/src/schemas/<entity>.ts`.
2. Re-export it from `packages/domain/src/schemas/index.ts`.
3. If it has lifecycle states, add the enum to `states.ts` and edges to `transitions.ts`.
4. Add API request/response shapes in `packages/domain/src/api/`.
5. Then implement DB / API / UI against the shared types — never against ad-hoc shapes.

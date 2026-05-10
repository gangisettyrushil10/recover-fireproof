# Fireproof — Local dev quickstart

Goal: get the Cedar Heights demo running on `http://localhost:3000` in ~10 minutes.

## 1. Prerequisites

- Node 20+ (`node --version`)
- pnpm 9+ (`pnpm --version`; `corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Docker + Docker Compose v2

## 2. Configure env

```sh
cp .env.example .env
```

The defaults match the values baked into `docker-compose.yml` (postgres
`fireproof:fireproof@localhost:5432/fireproof`, redis `localhost:6379`,
MinIO `localhost:9000` with `minio` / `minio12345`).

## 3. Start infra

```sh
docker compose up -d
```

This starts postgres, redis, minio (+ `createbuckets` one-shot which
creates `fireproof-originals` WITH OBJECT LOCK and `fireproof-derivatives`),
and mailhog. The `app` profile is intentionally NOT triggered, so api /
worker / web are not containerized — you run them natively below.

Verify:

- Postgres: `docker compose exec postgres pg_isready -U fireproof`
- MinIO console: http://localhost:9001 (login `minio` / `minio12345`)
- Mailhog UI: http://localhost:8025

## 4. Install workspace deps

```sh
pnpm install
```

## 5. Apply migrations

```sh
pnpm --filter @fireproof/db build
pnpm --filter @fireproof/api db:migrate
```

If the api package does not yet expose `db:migrate`, fall back to:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/0000_initial.sql
```

## 6. Seed the Cedar Heights demo

```sh
pnpm --filter @fireproof/seed seed
```

## 7. Run the apps

```sh
pnpm dev
```

Turbo runs `apps/web`, `apps/api`, and `apps/worker` in parallel.

## 8. Open the dashboard

- Web: http://localhost:3000 — Cedar Heights dashboard with five seeded
  exceptions.
- API: http://localhost:4000

## 9. Verify the demo flow

1. Cedar Heights dashboard shows five open exceptions.
2. Open the Day -116 impairment; state is `restored_evidence_incomplete`.
3. Hartwell rule summary lists missing blockers.
4. Closing the impairment is rejected with `BLOCKING_REQUIREMENTS_UNMET`.
5. Contradiction map shows the standpipe-omission conflict.
6. Packet builder produces an AHJ NOV response with missing items listed.
7. Vault shows originals with checksums and hold badges.
8. Applying a legal hold disables overwrite/delete paths.

## Caveats

- MinIO console: http://localhost:9001
- Mailhog UI: http://localhost:8025 (dev SMTP server, port 1025)
- To run everything in containers instead: `docker compose --profile app up -d --build`
- Reset state: `docker compose down -v` (drops `pgdata` and `miniodata`)

# Deploy guide

Two paths. Both produce the same demo: the L. Park login at `/login`, the
Cedar Heights dashboard at `/properties/<id>`, and the 422-blocked impairment
close.

---

## Path A — Hosted, one-click via Render

**Why this path**: a clickable URL for a reviewer; nothing to install on
their machine. Free tier hibernates after 15 min idle, so the first request
after a quiet stretch may cold-start for ~30s. That is the only caveat.

### Steps

1. **Push this repo to GitHub.** From the project root:

   ```bash
   git add .
   git commit -m "Recover Systems case-study build"
   gh repo create recover-fireproof --public --source=. --push
   # Or, if you don't have `gh`:
   #   create the repo manually at github.com, then:
   git remote add origin git@github.com:<you>/recover-fireproof.git
   git push -u origin main
   ```

2. **Sign in to Render** at <https://render.com> (free, GitHub OAuth).

3. **New + → Blueprint** → pick the repo you just pushed → **Apply**.
   Render reads `render.yaml` from the repo root and provisions:

   - `fireproof-db` — managed Postgres 16
   - `fireproof-api` — Fastify on `https://fireproof-api.onrender.com`
   - `fireproof-web` — Next.js on `https://fireproof-web.onrender.com`

   Initial build takes ~5–8 minutes. The API service runs migrations and
   the idempotent Cedar Heights seed on its first start.

4. **Smoke-check**:

   ```bash
   curl https://fireproof-api.onrender.com/healthz
   # {"ok":true,"ts":"…"}
   ```

   Then open `https://fireproof-web.onrender.com/login` and pick
   *L. Park (Office Manager)*.

### If you renamed services

`NEXT_PUBLIC_API_URL` is hard-coded in `render.yaml` to
`https://fireproof-api.onrender.com`. If you changed the api service name,
update that env var in the web service settings on Render and **trigger a
re-deploy** (it's a build-time variable in Next.js).

### If the free tier is too sleepy for the demo

Switch the two web services to **Starter ($7/mo each)** in Render. They
stay always-on. Or just warm them up before sharing the link by hitting
`/healthz` and `/login` once.

---

## Path B — Local, six commands

**Why this path**: never hibernates, never times out, never costs money.
Run it on your laptop while a reviewer is on a screen-share, or use the
captured screenshots in `docs/screenshots/` if a live walk-through isn't
practical.

### Prereqs

- **Node 20+**, **pnpm 9+**, **Postgres 16+** (`brew install postgresql@17`
  on macOS, or use the bundled `docker compose up -d postgres`).

### Steps

```bash
# 1. install
pnpm install

# 2. Postgres + role + DB
brew services start postgresql@17                           # or docker compose up -d postgres
psql postgres -c "CREATE USER fireproof WITH PASSWORD 'fireproof';" || true
psql postgres -c "CREATE DATABASE fireproof OWNER fireproof;"      || true

# 3. env
cp .env.example .env

# 4. schema + Cedar Heights seed
pnpm db:migrate
pnpm db:seed

# 5. build the workspace packages whose dist/ is consumed at runtime
pnpm --filter @fireproof/domain build
pnpm --filter @fireproof/rules build
pnpm --filter @fireproof/legal-export build

# 6. run
pnpm dev    # api on :4000, web on :3000
```

Open <http://localhost:3000/login>, sign in as `lpark@beacon.example`, and
follow [`docs/DEMO.md`](./DEMO.md).

### Reset to a clean demo state

```bash
pnpm --filter @fireproof/seed run seed:reset      # truncate + reseed
```

---

## What works, what doesn't, and why

| Capability | Local | Render |
|---|---|---|
| Login + dashboard | ✓ | ✓ |
| 422 BLOCKING_REQUIREMENTS_UNMET on close | ✓ | ✓ |
| Contradiction map | ✓ | ✓ |
| Packet generation (PDF + ZIP + manifest) | ✓ | ✓ |
| Legal hold blocking originals overwrite | ✓ | ✓ |
| Offline PWA (service worker disabled in dev) | service worker disabled | ✓ |
| Original blob storage | local FS at `.storage/` | ephemeral disk at `/opt/render/project/.storage` (resets between deploys) |
| BullMQ async workers | optional (`apps/worker`) | not enabled in blueprint — packets generate inline through API |

The blob storage caveat is the only meaningful gap: Render's free tier disk
is ephemeral, so a redeploy wipes generated packet ZIPs and any uploaded
document versions added at runtime. Originals seeded by the case-study
fixtures regenerate on next start because the seed is idempotent and the
content-addressed paths are deterministic.

If you need durable blob storage in production, swap the local filesystem
adapter for the S3 adapter (interface already defined in
`apps/api/src/storage/index.ts`; only a stub implementation today) and
point at S3 with Object Lock enabled. That's the production path; the
demo path doesn't need it.

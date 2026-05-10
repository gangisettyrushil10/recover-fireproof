# Pre-submission checklist

This file is for you, not the reviewer. Don't commit it if you'd rather it
stay private — or do; it's also fine context.

## Before you submit

### 1. Read `SUBMISSION.md` end-to-end (10 minutes)

It's good, but it's written in an agent's voice. Five places worth scanning
to put it in yours:

- Section 1's "three jobs in a trench coat" framing — keep if you like it,
  cut if it lands wrong for you.
- Section 2's single-sentence top of the failure-point answer — make sure
  *you* believe that's the right single sentence.
- Section 3 has a "deliberately does not do" list. Make sure each item is
  one you'd actually say out loud in an interview.
- Section 4 names Tom and Mike specifically as the resistance. Pick one
  and add one specific sentence about what you'd say to them.
- The closing paragraph claims "Carriers are the natural distribution
  channel." Strong line; only keep it if you'd defend it.

### 2. Pick your live-link strategy

Two options, both in [`docs/DEPLOY.md`](./docs/DEPLOY.md):

- **Render blueprint** (recommended). Push to GitHub, click *New +
  Blueprint* on Render, point at the repo, click Apply. ~8 minutes to live
  URLs. Free tier hibernates after 15 min idle — warm it up before
  sharing the link, or pay $14/mo total for two always-on services if it
  matters.
- **Local only**. Skip Render. The screenshots in
  [`docs/screenshots/`](./docs/screenshots/) prove the demo works; the
  reviewer can also run the six-command local quickstart.

If you go with Render and the api service name conflicts (Render names are
global), rename it in `render.yaml` and update the `NEXT_PUBLIC_API_URL`
in the web service to match.

### 3. Push to GitHub

The repo currently has no remote (it's a fresh `git init` inside the
`Recover/` folder). To push:

```bash
cd /Users/rushilgangisetty/Desktop/Projects/Recover
git add .
git commit -m "Recover Systems case-study build"
# create the repo on github.com first, or use:
gh repo create recover-fireproof --public --source=. --push
```

If you want it private during the review, swap `--public` for `--private`
and either invite the reviewer or send a temporary share link.

### 4. Smoke-test the live URL (if you deployed)

Render builds take 5–8 minutes. After the dashboard shows both services as
`Live`:

```bash
curl https://<your-api>.onrender.com/healthz
```

Then in a browser, open `https://<your-web>.onrender.com/login` and step
through `docs/DEMO.md`. The first request after a quiet period takes ~30s
because of free-tier hibernation; the rest are fast.

### 5. The submission email/message

Recover's packet asks for the report + a working prototype. A submission
that reads well:

> The repo is at <github.com/you/recover-fireproof>.
>
> - Report: `SUBMISSION.md` at the repo root.
> - Live demo: `https://fireproof-web.onrender.com` — sign in as
>   *L. Park (Office Manager)* and click the Day-116 sprinkler impairment.
>   The 9-step demo guide is `docs/DEMO.md`.
> - Screenshots if the live link is sleepy: `docs/screenshots/`.
> - Local run instructions: `README.md`.
>
> The wedge is in `apps/api/src/services/ExceptionLifecycleService.ts` and
> the evidence rules in `packages/rules/src/packs/hartwell_v1.ts`. The
> validation that rejects "pressure good" as a restoration test result is
> in `apps/api/src/services/evidence-validators/`.

## Things to *not* do

- Don't oversell. The packet warns explicitly against dissertation
  energy. The README, SUBMISSION, and DEMO are intentionally tight.
- Don't promise BullMQ workers, MinIO Object Lock, or the GitHub Actions
  CI as part of the demo. They exist in the repo for the curious reader;
  `docs/ARCHITECTURE.md` is honest about what's on the critical path.
- Don't refer to "Fireproof, Inc." or pitch it as a startup. The README
  opener explicitly says it's a working name for the prototype.

## Known minor cosmetics

- The packet builder screenshot (`docs/screenshots/06-packet-ready.png`)
  shows three duplicate `Demo AHJ packet` draft entries because the
  Playwright capture re-ran the create step. The first row is the real
  generated packet with status `ready` and a working download link. If
  you want a tidy reshoot, run `pnpm --filter @fireproof/seed run
  seed:reset` and re-run `apps/web/scripts/capture.ts`.
- The hero shot (`00-hero.png`) is functionally identical to `04-close-blocked.png`
  because the BlockingAlert renders on the exception detail page whether
  or not the user has just clicked Request close — that's correct
  behavior, but if you want a clearer "click and see the error" frame,
  capture the page state immediately after `closeMutation.mutate()`.

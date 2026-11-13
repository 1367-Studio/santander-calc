# v1 rate pipeline (legacy)

> Kept for reference while v1 installs are migrated. In v2, rates are edited as **rate cards** in the Rate Studio and served by `/api/rate-card` — see the main README. Retire this pipeline once the Rate Studio is live.

## Updating rates via Sanity

The widget itself stays 100% static — no runtime dependency on Sanity, no added
latency for visitors. Rates are edited in a Sanity Studio and synced into the
`revolving_bands_*.json` files, same as if you'd hand-edited them.

**Important:** these JSON files are served **directly by GitHub Pages**
(`https://1367-studio.github.io/santander-calc/`), straight off this repo's `main`
branch — they are *not* part of the published npm package (check `package.json`'s
`files` list: only `loader.js`/`index.js`/`SantanderCalcButton.jsx`/`index.d.ts` go to
npm). So updating a rate is just: write the JSON, commit, push — GitHub Pages
redeploys on its own in about a minute. No `npm publish` involved, ever, for a rate
change.

**What's editable in Sanity, per band:** TAEG (`apr_representative`), Debetrente
(`apr_nominal`), card fee (`open_fee_monthly`), the valid-from date, and the FR legal
sentence. `monthly_rate` is *never* edited directly — it's always recomputed from the
TAEG with `monthly_rate = (1 + TAEG)^(1/12) - 1` (see `scripts/rate-formula.mjs`).

**What's intentionally NOT editable in Sanity:** `sub_ranges`, `payment_step`,
`min_payment`. Those encode Santander's minimum-payment ladder — a separate policy
from the interest rate, not derivable from the TAEG. If that ladder changes, it
requires a fresh official repayment table from Santander and the `derive_band_*.js` /
`verify_band_*.js` calibration scripts to regenerate it — this Sanity flow doesn't
cover that case.

### One-time setup

`studio/` is an already-initialized Sanity Studio (project `0bw3bd6q`, dataset
`production`), deployed at **https://santander-calc.sanity.studio/** — this is the
URL to hand to whoever edits rates; they log in with their own Sanity account, no
local setup needed. To run it locally instead (for schema changes): `cd studio &&
npm install && npm run dev`. After changing the schema, redeploy with `cd studio &&
npx sanity deploy`.

Root-level setup, if starting fresh:
1. `cp .env.example .env`, fill in `SANITY_PROJECT_ID=0bw3bd6q`, `SANITY_DATASET=production`,
   and `SANITY_WRITE_TOKEN` (Studio → API → Tokens → create one with **Editor** access —
   `https://sanity.io/manage/project/0bw3bd6q/api`).
2. `npm install` then `npm run seed:sanity` — pushes the 4 bands' current values into
   Sanity so the Studio starts populated instead of empty. Safe to re-run, but don't
   run it again once someone has started editing real rates (it would overwrite them).

### Whenever Santander changes a rate — fully automated

1. Edit the band's TAEG (and Debetrente, if it also changed) in the Studio and hit Publish.
2. A Sanity webhook fires a `repository_dispatch` to this repo, which runs
   `.github/workflows/sync-sanity-rates.yml`: it re-derives `monthly_rate` from the
   TAEG, rewrites the JSON at the repo root, commits, and pushes to `main` — all
   unattended, no PR, no human review. GitHub Pages redeploys on its own from there,
   typically live for visitors in 1–3 minutes.
3. The only safety net is mechanical: the workflow refuses to run (and writes
   nothing) if TAEG/Debetrente are outside a sane 0–50% range, the card fee is outside
   0–5%, or the FR legal text is empty. It does **not** catch "technically valid but
   wrong" numbers (e.g. a typo that's still a plausible-looking rate) — whoever edits
   Sanity is the only review step that exists.
4. If validation rejects a document, it isn't silent: the workflow patches that
   document's `lastSyncError` / `lastSyncErrorAt` fields in Sanity, which renders as a
   red banner directly on the document in the Studio (and a "❌ SYNC ERROR" tag in the
   list view) — so whoever edited it sees why it didn't go out next time they open the
   Studio, not just in a GitHub Actions log nobody is watching. Fixing the value and
   publishing again clears the banner automatically on the next successful sync.

**One-time wiring this needs (not done yet):**
- GitHub repo secrets (Settings → Secrets and variables → Actions): `SANITY_PROJECT_ID`,
  `SANITY_DATASET`, `SANITY_READ_TOKEN` (a *read-only* Viewer-role token, used for the
  normal read/sync), and `SANITY_WRITE_TOKEN` (an Editor-role token, used only to patch
  `lastSyncError`/`lastSyncErrorAt` back onto a document when validation rejects it).
- Two Sanity webhooks (Studio → API → Webhooks → Create webhook), both posting to
  `https://api.github.com/repos/1367-Studio/santander-calc/dispatches`, method `POST`,
  header `Authorization: Bearer <a GitHub PAT with repo scope>` and
  `Accept: application/vnd.github+json`, triggering on `Create`/`Update` of
  `revolvingRateBand` documents — the two differ only in their filter and body:

  | Webhook | Filter | Body |
  |---|---|---|
  | Production | `publishToDevOnly != true` | `{"event_type": "sanity-rate-sync"}` |
  | Dev | `publishToDevOnly == true` | `{"event_type": "sanity-rate-sync-dev"}` |

  Each edit matches exactly one of the two filters, so publishing in Sanity always
  triggers the right workflow automatically — whoever edits never needs to open GitHub.

### Testing a rate change before it's real — the `dev/` mirror

Every `revolvingRateBand` document has a **"Test mode"** toggle.

- **Toggle on** → edit the rate, hit Publish → the dev webhook fires → the dev
  workflow writes *every* band (including this one) into `dev/revolving_bands_*.json`
  — an isolated copy, never the production files. Live at:
  ```
  https://1367-studio.github.io/santander-calc/dev/?total=800&lang=fr&autoopen=true
  ```
  (swap `total` for whatever amount to preview its schedule). The production webhook
  also fires on this edit, but its filter excludes the toggled band, so production is
  untouched.
- **Toggle off** → Publish again → the production webhook fires, and this band is
  included in the next production sync.

Both workflows can also be triggered by hand from the Actions tab ("Run workflow") —
useful for debugging, but not needed for normal use once the two webhooks are set up.

### Manual fallback (local testing, or if the automation is ever disabled)

1. At the repo root: `npm run sync:sanity:dry-run` to preview the diff (or
   `npm run sync:sanity:dev:dry-run` to target the `dev/` mirror instead), then
   `npm run sync:sanity` (or `sync:sanity:dev`) to actually rewrite the files.
2. Review the git diff, commit, and push to `main`.

---

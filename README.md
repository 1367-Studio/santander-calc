# santander-calc

Santander revolving credit calculator widget. Works in **plain HTML** and **React / Next.js**.

---

## How it works

The widget renders an inline button that opens a modal showing the revolving credit repayment schedule. All calculations happen in the browser — no backend required.

---

## Plain HTML

Drop the `<script>` tag wherever you want the button to appear:

```html
<script
  src="https://cdn.jsdelivr.net/npm/santander-calc/loader.js"
  data-total="1250"
  data-lang="fr">
</script>
```

### Available attributes

| Attribute | Description | Default |
|---|---|---|
| `data-total` | Total amount in euros | `0` |
| `data-lang` | Language: `fr` `en` `nl` `de` | `fr` |
| `data-primary` | Primary hex color (without `#`) | `e60000` |
| `data-bg` | Modal background color (without `#`) | `ffffff` |
| `data-header-bg` | Modal header background (without `#`) | same as primary |
| `data-header-fg` | Modal header text color (without `#`) | `ffffff` |
| `data-btn-text` | Custom button label (overrides auto-translation) | auto-translated |
| `data-width` | Button width | `auto` |
| `data-autoopen` | Open modal automatically on page load, no button rendered | `false` |
| `data-embed` | Render the schedule directly in the page — no button, no popup | `false` |

### Full example

```html
<!-- With button (product page) -->
<script
  src="https://cdn.jsdelivr.net/npm/santander-calc/loader.js"
  data-total="2500"
  data-lang="fr"
  data-primary="e60000"
  data-bg="ffffff"
  data-header-bg="e60000"
  data-header-fg="ffffff"
  data-btn-text="Voir l'échéancier"
  data-width="100%">
</script>

<!-- Auto-open (dedicated calculator page — no button) -->
<script
  src="https://cdn.jsdelivr.net/npm/santander-calc/loader.js"
  data-lang="fr"
  data-primary="e60000"
  data-autoopen="true">
</script>

<!-- Embed (inline in page — no button, no popup, content always visible) -->
<script
  src="https://cdn.jsdelivr.net/npm/santander-calc/loader.js"
  data-total="1500"
  data-lang="fr"
  data-primary="e60000"
  data-embed="true"
  data-width="100%">
</script>
```

### Platform examples

**Shopify Liquid:**
```liquid
<script
  src="https://cdn.jsdelivr.net/npm/santander-calc/loader.js"
  data-total="{{ cart.total_price | divided_by: 100.0 }}"
  data-lang="{{ request.locale.iso_code }}">
</script>
```

**PHP / WordPress:**
```php
<script
  src="https://cdn.jsdelivr.net/npm/santander-calc/loader.js"
  data-total="<?= $cart_total ?>"
  data-lang="<?= $locale ?>">
</script>
```

---

## React / Next.js

### Installation

```bash
npm install santander-calc
```

### Usage

```tsx
import { SantanderCalcButton } from "santander-calc";

export default function CartPage() {
  return (
    <div>
      <button>Checkout</button>
      <SantanderCalcButton total={1250} lang="fr" />
    </div>
  );
}
```

### Props

| Prop | Type | Description | Default |
|---|---|---|---|
| `total` | `number` | Total amount in euros | — |
| `lang` | `"fr" \| "en" \| "nl" \| "de"` | Language | `"fr"` |
| `primary` | `string` | Primary hex color | `"#e60000"` |
| `bg` | `string` | Modal background color | `"#ffffff"` |
| `headerBg` | `string` | Modal header background | same as primary |
| `headerFg` | `string` | Modal header text color | `"#ffffff"` |
| `btnText` | `string` | Custom button label | auto-translated |
| `className` | `string` | CSS class on the button | — |
| `style` | `object` | Inline styles on the button | — |
| `embed` | `boolean` | Render inline in page — no button, no popup | `false` |
| `width` | `string` | Width of the embed iframe | `"100%"` |

> **Button label** — The button text is automatically translated based on `lang`:
> `fr` → "Voir l'échéancier" · `en` → "See schedule" · `nl` → "Schema bekijken" · `de` → "Plan anzeigen"
> Use `btnText` to override with a fixed label regardless of language.

### Full example

```tsx
<SantanderCalcButton
  total={2500}
  lang="fr"
  primary="#e60000"
  bg="#ffffff"
  headerBg="#e60000"
  headerFg="#ffffff"
  btnText="Voir l'échéancier"
  className="my-button-class"
  style={{ marginTop: "12px", width: "100%" }}
/>
```

### Next.js (App Router)

The component already includes `"use client"` and can be imported directly in Server Components:

```tsx
// app/cart/page.tsx (Server Component)
import { SantanderCalcButton } from "santander-calc";

export default async function CartPage() {
  const cart = await getCart();
  return (
    <SantanderCalcButton total={cart.total} lang="fr" />
  );
}
```

---

## Supported languages

| Code | Language |
|---|---|
| `fr` | Français |
| `en` | English |
| `nl` | Nederlands |
| `de` | Deutsch |

---

## Amount ranges

The calculator automatically selects the correct repayment schedule based on the total:

| Range | Interval |
|---|---|
| A | € 0 – € 1,250 |
| B | € 1,250 – € 5,000 |
| C | € 5,001 + |

---

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

## License

UNLICENSED — private use only.

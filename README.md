# santander-calc

Santander's revolving-credit ("ouverture de crédit") repayment calculator for partner shops in Belgium. It shows a month-by-month schedule with the TAEG, the legal sentence and the mandatory warning. Santander manages the rates itself, and the calculator refuses rates that would produce a wrong schedule.

- **Any website**: one `<script>` tag (all v1 tags keep working)
- **React / Next.js**: `npm install santander-calc`
- **Shopify**: an app with a product/cart block and a cart-drawer embed
- **Santander back office**: the Rate Studio (Sanity), live in every shop within a minute

```
 Santander staff ──► Rate Studio (Sanity) ── publish ──► webhook ──► Vercel app
                     • checks every change                           /api/rate-card  (cached, CORS)
                     • preview + reference simulations                     │
                                                                          ▼
          <santander-calc> web component  ◄── script tag · React · Shopify app
```

---

## For Santander: changing the rates

Open the **Rate Studio**: <https://santander-calc.sanity.studio> → **Rate cards**.

A *rate card* holds everything the calculator needs on a given date:

| Field | What it is |
|---|---|
| **Valid from** | The date the rates take effect. It's printed in the legal text ("Taux valable au …"). |
| **What changed** | A short note for the audit trail. |
| **Tiers** | One per credit limit (today: up to 1 250 €, and 1 251 – 5 000 €). Each holds the TAEG, debit rate, card fee, minimum payment and **payment ladder**. |
| **Safety checks** | Per tier: the **maximum repayment period** and the **reference simulations** from Santander's own tool. |
| **Texts** | Optional overrides of the warning, title and legal sentences in FR / NL / EN / DE. |

**To change the rates on a future date**, *duplicate* the current rate card and set the new **Valid from** date. Then update the rates, paste the new payment ladder and enter the new reference simulations. Publish it. It goes live by itself that morning (Brussels time), and the old card stays as history.

**To correct the current card**, edit it and publish. Shops see the change within about a minute.

### The calculator refuses rates it can't calculate correctly

The Studio, the API and the test suite share one validation function ([widget/src/ratecard.ts](widget/src/ratecard.ts)). Publishing is blocked when:

1. **The TAEG doesn't match the debit rate + card fee.** The TAEG must equal `((1 + debit rate)^(1/12) − 1 + card fee + 1)^12 − 1` within 0.02 points. That catches typos (16.94 instead of 16.49) and swapped fields. All four historical bands pass.
2. **A rate is implausible**, e.g. 1649 instead of 16.49.
3. **The payment ladder is broken**: gaps, overlaps, payments going down, a step that doesn't cover its monthly interest, or a ladder that stops before the credit limit.
4. **Any amount in a tier would take longer to repay than the maximum period.** Every whole-euro amount is simulated.
5. **A reference simulation doesn't match to the cent** (first payment, number of months, last payment). This ties new rates to Santander's official numbers. If the TAEG changes but the ladder doesn't, the simulations stop matching and publishing is blocked.
6. **The tiers overlap or leave a gap, or the date is missing.** v1 printed *today's* date when the date was missing.

The monthly rate used in the schedule is never typed in. It's always derived from the TAEG: `(1 + TAEG)^(1/12) − 1`. The **Preview & checks** tab shows each check, the reference simulations side by side, and the real widget with the draft rates.

> ⚠️ Santander needs to confirm two values that were seeded from v1's output: the **maximum repayment periods** (43 months for ≤ 1 250 €, 93 months for 1 251–5 000 €) and the **reference simulations**. Replace them with the legal zeroing periods and simulations from Santander's tool.

---

## For shops: adding the calculator

### Any website

```html
<script
  src="https://santander-calc.vercel.app/v2/loader.js"
  data-total="1250"
  data-lang="fr">
</script>
```

| Attribute | Description | Default |
|---|---|---|
| `data-total` | Amount to finance, in euros | `0` (the shopper types it) |
| `data-lang` | `fr` `nl` `en` `de` | page language, else `fr` |
| `data-primary` | Accent colour (`#ec0000` or `ec0000`) | Santander red |
| `data-bg` / `data-header-bg` / `data-header-fg` | Popup colours | white / primary / white |
| `data-btn-text` | Button label | translated "Voir l'échéancier" |
| `data-width` | e.g. `100%` | `auto` |
| `data-embed="true"` | Show the schedule in the page (no button) | |
| `data-autoopen="true"` | Open the popup on page load | |
| `data-font` | CSS font-family for the widget | inherits the page's font |

The v1 URL `https://cdn.jsdelivr.net/npm/santander-calc/loader.js` serves the same script once 2.0.0 is published to npm.

You can also use the element directly: `<santander-calc amount="1250" lang="nl" mode="inline"></santander-calc>`. To restyle the button, use `santander-calc::part(button) { … }`. To track usage, listen for `santander-calc:open`, `:close` and `:change` (detail: `amount`, `tier`, `firstPayment`, `months`).

### React / Next.js

```tsx
import { SantanderCalcButton } from "santander-calc";

<SantanderCalcButton total={cart.total} lang="fr" />               // button + popup
<SantanderCalcButton total={cart.total} lang="nl" embed />         // inline
<SantanderCalcButton total={cart.total} onChange={(s) => track(s)} />
```

The v1 props are unchanged (`total`, `lang`, `primary`, `bg`, `headerBg`, `headerFg`, `btnText`, `className`, `style`, `embed`, `width`). There are two new ones: `api` and `onChange`. The component is SSR-safe, and the element only registers in the browser.

### Shopify

Install the **Santander Credit Calculator** app, then in **Online Store → Customize**:

- **Product or cart page** → *Add block* → **Credit calculator**. The amount comes from the selected variant × quantity, or from the cart total.
- **Cart drawer** → *Theme settings → App embeds* → **Cart drawer button**. It places a button above the drawer's checkout button.

The blocks load a 1.9 KB script. The full widget (9 KB brotli) downloads only when a shopper hovers or taps, which keeps the extension inside Shopify's performance budget.

---

## For developers

```
widget/   calculation engine, validation, <santander-calc> element, loaders  (TypeScript, zero dependencies)
web/      Vercel app: partner page, /api/rate-card, Sanity + Shopify webhooks  (Next.js 16)
studio/   Rate Studio schema, structure and preview                             (Sanity v6)
shopify/  extension-only Shopify app: theme app extension                       (Shopify CLI)
scripts/  seed-rate-card.mjs (v2) · sync/seed scripts of the v1 JSON pipeline
*.json, index.html, santander-revolving.{js,css}, loader.js
          v1 widget, still served by GitHub Pages for existing installs — don't move them
```

```bash
npm install
npm test              # engine parity with v1 + every safety rule (node --test)
npm run typecheck
npm run build         # dist/, web/public/v2/, shopify/…/assets/
npm run dev:web       # http://localhost:3100
```

`widget/test/parity.test.ts` runs the v1 schedule loop, copied verbatim, against the new engine for every euro from 1 to 5 000 and every cent around each ladder boundary. v2 is identical to the cent. The one intended difference is that amounts above the highest credit limit now get a message instead of a schedule.

### Going live (one time)

1. **Vercel**: point the project at `web/` (Root Directory) and set the env vars in [web/.env.example](web/.env.example). Until a rate card exists in Sanity, `/api/rate-card` serves today's rates from the repository JSON (`X-Rate-Card-Source: repo-fallback`).
2. **Sanity**:
   - `cd studio && npx sanity deploy` publishes the new schema and Studio.
   - `npm run seed:rate-card` creates the first rate card from today's JSON. Use `:dry-run` to preview it. The script refuses to run if a rate card already exists.
   - Add a webhook (sanity.io/manage → API → Webhooks): `POST https://<app>/api/revalidate`, filter `_type == "rateCard"`, header `Authorization: Bearer <SANITY_REVALIDATE_SECRET>`.
3. **Widget rollout**:
   - Check `https://<app>/api/rate-card`.
   - `npm publish` runs the tests, builds, and replaces `./loader.js` with v2. That moves jsDelivr users over.
   - Commit the new `loader.js` so GitHub Pages serves it as well.
   - If the production domain isn't `santander-calc.vercel.app`, build with `SC_API_BASE=https://…` first.
4. **Shopify**: `cd shopify && npm install && npm run config:link`, then `npm run deploy`. Use custom distribution until Santander agrees to publish it under its name. Set `SHOPIFY_API_SECRET` on Vercel for the privacy webhooks.
5. **Retire the v1 pipeline** ([docs/v1-rate-pipeline.md](docs/v1-rate-pipeline.md)) once the Rate Studio is in use. Disable the two Sanity → GitHub Actions webhooks and the `sync-sanity-rates*.yml` workflows. The legacy bands stay visible in the Studio under *Legacy bands*.

### Why v1 never became a Shopify app

v1 was the storefront script of a theme. It had no app config, no theme app extension, no install flow and no privacy webhooks. Its rates were JSON files that each merchant would have uploaded to their theme assets, which App Store review rejects and which means touching every store on each rate change. It found the cart drawer and copied the checkout button's style by guessing at theme markup, which breaks from theme to theme. v2 fixes the technical side: a theme app extension with rates served centrally. Two points remain business decisions:

- **Publisher.** A public App Store listing under the Santander brand has to be published by Santander, or with its written authorisation. Until then, distribute the app privately to partner merchants.
- **Scope.** The app shows a credit simulation. It doesn't finance the order at checkout, which only Shopify-approved payment partners can do.

---

UNLICENSED — private use only.

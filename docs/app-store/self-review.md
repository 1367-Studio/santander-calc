# App Store AI self-review — Santander Credit Calculator

Run on 13 November 2026 against Shopify's live list of
[locally checkable App Store requirements](https://shopify.dev/docs/apps/launch/app-store-review/app-store-ai-self-review-requirements),
following the Shopify AI Toolkit's `/shopify-app-store-review` instructions, on
branch `feat/shopify-app-store` after deploying it (app version
`santander-credit-calculator-4`).

The Shopify CLI's `shopify doc fetch` couldn't reach shopify.dev from the review
environment, so the requirement list was read from the same page in the browser.

## Summary

- ✅ **Likely passing:** 32
- ❌ **Likely failing:** 0
- ⚠️ **Needs review:** 2
- ⏭️ **Groups skipped:** 8

The agent reviewed the subset of requirements Shopify selected as checkable
against a local codebase. Shopify still reviews these and more on submission.

## ⚠️ Requirements that need review

⚠️ **1.1.16 Don't provide capital lending**

**Why this needs attention:** The rule targets loans, cash advances and other
financing *for merchants*. This app gives no money to merchants. It shows
*shoppers* a simulation of Santander's consumer revolving credit (schedule, APR,
legal notice). A reviewer may still read "credit" as lending, so be ready to
explain that the app only displays Santander's own regulated offer and moves no
money.

**What was detected:** `widget/src/calc.ts`, `widget/src/element.ts` and the
`Credit calculator` block compute and display a repayment schedule. There is no
lending, checkout or payment logic.

⚠️ **2.2.1 Use Shopify APIs**

**Why this needs attention:** The app requests no access scopes and makes no
Admin API calls. It is a theme app extension plus an embedded admin page.
Shopify-managed installation and App Bridge session tokens are its only
platform integration. That fits a storefront-only app, but confirm the
reviewer accepts it.

**What was detected:** `scopes = ""` in `shopify/shopify.app.toml`; session
tokens verified in `web/lib/shopify-session.ts`; no GraphQL or REST client.

## ❌ Requirements that are likely failing

None.

## ✅ Passing (count only)

1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.6, 1.1.7, 1.1.8, 1.1.9, 1.1.10, 1.1.13, 1.1.14,
1.1.15, 1.2.1, 1.2.2, 1.2.3, 2.2.3, 2.2.4, 2.2.6, 2.2.7, 2.3.1, 2.3.2, 2.3.3,
2.3.4, 3.1.1, 3.2.1–3.2.5 (no scopes requested), 5.1.1, 5.1.3, 5.1.5, 5.3.3.

Group 5.3 (Payment facilitator) is opt-in, but it was evaluated because the
app's capabilities include Payment facilitator: the app is free for merchants
(a single Free plan, no billing calls or paywalls).

## Skipped groups

- **5.2 Payment** — no `type = "payment"` extension, no `write_payment_gateway` scope
- **5.4 Purchase option** — no subscription or payment-mandate scopes
- **5.5 Product sourcing** — opt-in only
- **5.6 Checkout customization** — no checkout UI extension
- **5.7 Sales channel** — no `channel_config` extension
- **5.8 Post purchase** — no `checkout_post_purchase` extension
- **5.9 Mobile app builders** — opt-in only
- **5.10 Donation** — opt-in only

## Resources

- [App Store requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements)
- [Best practices for apps](https://shopify.dev/docs/apps/launch/shopify-app-store/best-practices)
- [About billing for your app](https://shopify.dev/docs/apps/launch/billing)
- [Submitting your app for review](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review)

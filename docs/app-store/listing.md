# Shopify App Store listing — Santander Credit Calculator

Everything entered in the Partner Dashboard listing (English, primary). Character
limits are Shopify's. Assets are in this folder.

## Assets

| Field | File | Size |
|---|---|---|
| App icon (Dev Dashboard → app → Settings) | `app-icon-1200.png` | 1200 × 1200 |
| Feature media (image) | `feature-image-1600x900.png` | 1600 × 900 |
| Desktop screenshot 1 | `screenshots/01-product-page-schedule.png` | 1600 × 900 |
| Desktop screenshot 2 | `screenshots/02-inline-schedule.png` | 1600 × 900 |
| Desktop screenshot 3 | `screenshots/03-cart-drawer.png` | 1600 × 900 |
| Desktop screenshot 4 | `screenshots/04-legal-four-languages.png` | 1600 × 900 |

Screenshots are the real widget (`dist/santander-calc.js`) with the repository's
rate card, in a fictional demo shop ("Atelier Nord"). The icon is an original
design and does not use Santander's logo.

## Basic app information

- **App name** (30): Santander Credit Calculator
- **Primary category**: Store design → Product display *(pick the closest available)*
- **Languages**: English (admin page). The storefront calculator speaks FR, NL, EN and DE.

## Listing content

**Introduction** (100)
> Show what buying on Santander credit costs per month. Shoppers see the full schedule before buying.

**App details** (500)
> Belgian shoppers often want to know what a purchase will cost each month before they buy. This app adds Santander's revolving credit calculator to your theme. Shoppers see a month-by-month repayment schedule for the product or cart amount, with the APR (TAEG), the representative example and the mandatory warning. Santander updates the rates centrally, so they're always current in your store. You choose the language, colours and whether the schedule opens in a pop-up or shows in the page.

**Features** (80 each)
1. Repayment schedule for the selected variant, quantity or full cart total
2. APR (TAEG), legal notice and mandatory warning included in every simulation
3. Rates updated centrally by Santander, with nothing to update in your store
4. Product page, cart page and cart drawer placements, inline or in a pop-up
5. Available in French, Dutch, English and German, with your own accent colour

**Screenshot alt text** (64 each)
1. Product page with the repayment schedule pop-up open
2. Repayment schedule shown inline under the Add to cart button
3. Calculator button above checkout in the cart drawer
4. German schedule with APR, legal notice and warning

## Support and resources

- Preferred support channel: email — contact@1367studio.com
- Privacy policy: https://santander-calc.vercel.app/privacy
- Developer website: https://1367studio.com

## Pricing

- One public plan: **Free**

## App discovery

- **App card subtitle** (62): Show the monthly cost of Santander credit on product pages
- **Search terms** (20 each): credit calculator · financing · installments · payment schedule · consumer credit
- **Title tag** (60): Santander Credit Calculator – monthly payment schedule
- **Meta description** (160): Show Belgian shoppers the monthly repayment schedule, APR and legal notice for Santander revolving credit on product, cart and cart drawer pages.

## Install requirements

- Requires the Online Store (theme app extension)
- Merchant business address: Belgium · Currency: EUR

## App testing information

No account needed. Instructions for the reviewer:

> The app is a theme app extension with one embedded admin page. It requests no
> access scopes and stores no merchant or customer data.
> 1. Install the app. The admin page opens and confirms the store is connected.
> 2. Click "Add to product page". The theme editor opens with the Credit
>    calculator block added to the product template. Save.
> 3. On any product page, click "Voir l'échéancier". A pop-up shows the
>    month-by-month repayment schedule for the selected variant × quantity, with
>    the APR (TAEG), the legal notice and the mandatory warning.
> 4. Optional: in the block settings, switch the display to "Schedule shown in the
>    page", or change the language (FR, NL, EN, DE) and accent colour.
> 5. Optional: click "Turn on the app embed" to add a button above the checkout
>    button in the cart drawer (Dawn).
> Rates come from Santander's rate service at santander-calc.vercel.app and are
> the same for every store. The app shows a simulation only and does not offer
> financing at checkout.

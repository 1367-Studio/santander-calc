import type { NextRequest } from "next/server";
import { SHOPIFY_API_KEY } from "@/lib/shopify-session";

/**
 * App home of the Shopify app — the page merchants see in their admin after
 * installing it (shopify.app.toml → application_url).
 *
 * It is plain HTML on purpose: App Bridge must be the first script in <head>,
 * and Polaris web components need no build step. Shopify installs the app
 * itself (managed installation, no scopes), so there is no OAuth callback:
 * App Bridge hands this page a session token, which /api/shopify/session
 * verifies before any store-specific link is shown.
 */

const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

export function GET(request: NextRequest) {
  const shopParam = request.nextUrl.searchParams.get("shop") ?? "";
  const shop = SHOP_RE.test(shopParam) ? shopParam.toLowerCase() : "";

  // Only the merchant's admin may frame this page.
  const frameAncestors = shop ? `https://${shop} https://admin.shopify.com` : "https://admin.shopify.com";

  return new Response(page(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": `frame-ancestors ${frameAncestors};`,
      "Cache-Control": "no-store",
    },
  });
}

const blockLink = `shopify://admin/themes/current/editor?template=product&addAppBlockId=${SHOPIFY_API_KEY}/calculator&target=mainSection`;
const cartLink = `shopify://admin/themes/current/editor?template=cart&addAppBlockId=${SHOPIFY_API_KEY}/calculator&target=mainSection`;
const embedLink = `shopify://admin/themes/current/editor?context=apps&activateAppId=${SHOPIFY_API_KEY}/cart-drawer`;

function page() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="shopify-api-key" content="${SHOPIFY_API_KEY}">
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Santander Credit Calculator</title>
</head>
<body>
  <s-page heading="Santander Credit Calculator">
    <s-banner id="status" tone="info">Connecting to your store…</s-banner>

    <s-section heading="Show the repayment schedule on your product pages">
      <s-paragraph>
        Add the calculator to your theme so shoppers can see what paying for an item with Santander’s revolving credit costs each month:
        the full schedule, the TAEG, the legal notice and the mandatory warning. The amount follows the selected variant and quantity.
      </s-paragraph>
      <s-stack direction="inline" gap="base">
        <s-button variant="primary" href="${blockLink}" target="_top">Add to product page</s-button>
        <s-button href="${cartLink}" target="_top">Add to cart page</s-button>
      </s-stack>
    </s-section>

    <s-section heading="Optional: button in the cart drawer">
      <s-paragraph>
        Turn on the <s-text type="strong">Cart drawer button</s-text> app embed to place a calculator button above the drawer’s checkout button.
        It works with Dawn and most Online Store 2.0 themes.
      </s-paragraph>
      <s-button href="${embedLink}" target="_top">Turn on the app embed</s-button>
    </s-section>

    <s-section heading="Rates">
      <s-paragraph id="rates">Loading the rates in force…</s-paragraph>
      <s-paragraph>
        Santander publishes the rates itself. Changes reach your store within a minute, with nothing to update on your side.
      </s-paragraph>
    </s-section>

    <s-section heading="Settings and help">
      <s-paragraph>
        Language (FR, NL, EN, DE), accent colour, button label and inline or pop-up display are set in the block’s settings in the theme editor.
        The app reads no customer or order data. Questions: <s-link href="mailto:contact@1367studio.com">contact@1367studio.com</s-link>.
      </s-paragraph>
    </s-section>
  </s-page>

  <script>
    (async () => {
      const status = document.getElementById("status");
      try {
        // App Bridge adds the session token to same-origin fetch calls.
        const res = await fetch("/api/shopify/session");
        if (!res.ok) throw new Error(String(res.status));
        const { shop } = await res.json();
        status.setAttribute("tone", "success");
        status.textContent = "The app is installed on " + shop + ". Add the block below to start showing the calculator.";
      } catch (e) {
        status.setAttribute("tone", "critical");
        status.textContent = "We couldn’t verify your session. Reload the page from your Shopify admin.";
      }

      try {
        const card = await (await fetch("/api/rate-card")).json();
        const pct = (f) => (f * 100).toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %";
        const eur = (n) => n.toLocaleString("fr-BE") + " €";
        const date = card.validFrom.split("-").reverse().join("/");
        const tiers = card.tiers.map((t) => eur(t.limitMin) + " – " + eur(t.limitMax) + ": TAEG " + pct(t.aprRepresentative)).join(" · ");
        document.getElementById("rates").textContent = "Valid from " + date + " — " + tiers;
      } catch (e) {
        document.getElementById("rates").textContent = "The rates are shown in the calculator on your storefront.";
      }
    })();
  </script>
</body>
</html>`;
}

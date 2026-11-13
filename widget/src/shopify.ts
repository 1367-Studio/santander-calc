/**
 * Full widget for Shopify, loaded on demand by shopify-boot.ts. Wires
 * <santander-calc data-shopify-source="…"> elements to live store data:
 *
 *   data-shopify-source="cart"     amount = cart total, read from /cart.js on open
 *   data-shopify-source="product"  amount = selected variant price × quantity
 *                                  (variant prices come from data-variant-prices)
 */
import { define, type SantanderCalcElement } from "./element.ts";

declare global {
  interface Window {
    Shopify?: { routes?: { root?: string } };
  }
}

const root = () => window.Shopify?.routes?.root || "/";

async function cartTotal(): Promise<number> {
  const r = await fetch(`${root()}cart.js`, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`cart.js HTTP ${r.status}`);
  const cart = await r.json();
  return (cart.total_price || 0) / 100;
}

function productAmount(el: HTMLElement): number {
  const prices: Record<string, number> = JSON.parse(el.dataset.variantPrices || "{}");
  const form =
    el.closest("form[action*='/cart/add']") ||
    document.querySelector(`form[action*='/cart/add'][data-product-id='${el.dataset.productId}']`) ||
    document.querySelector("form[action*='/cart/add']");
  const variantId =
    (form?.querySelector("[name='id']") as HTMLInputElement | null)?.value ||
    new URLSearchParams(location.search).get("variant") ||
    el.dataset.variantId ||
    "";
  const qty = Math.max(1, parseInt((form?.querySelector("[name='quantity']") as HTMLInputElement | null)?.value || "1", 10) || 1);
  const cents = prices[variantId] ?? Number(el.dataset.fallbackPrice || 0);
  return (cents * qty) / 100;
}

function wire(el: SantanderCalcElement) {
  if (el.resolveAmount) return;
  const source = el.dataset.shopifySource;
  if (source === "cart") el.resolveAmount = cartTotal;
  if (source === "product") el.resolveAmount = () => productAmount(el);
}

function scan(scope: ParentNode = document) {
  scope.querySelectorAll<SantanderCalcElement>("santander-calc[data-shopify-source]").forEach(wire);
}

// Wire elements before they upgrade so the first open() already sees live data.
scan();
define();
let queued = false;
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    scan();
  });
}).observe(document.body, { childList: true, subtree: true });

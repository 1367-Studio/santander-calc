/**
 * Shopify boot script — the only JavaScript the theme app extension loads
 * up front (Shopify asks for < 10 KB per app block). The blocks render a
 * plain-HTML button inside <santander-calc>; the full widget
 * (santander-calc.js, next to this file in the extension's assets) is only
 * fetched when a shopper shows intent (hover, focus, tap), or right away when
 * a block is set to show the schedule inline.
 */
type Calc = HTMLElement & { open(): Promise<void> };

const current = document.currentScript as HTMLScriptElement | null;
const bundleUrl = current?.src.replace("santander-calc-boot.js", "santander-calc.js") ?? "";
let loading: Promise<unknown> | null = null;

function load(): Promise<unknown> {
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = bundleUrl;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    }).then(() => customElements.whenDefined("santander-calc"));
    loading.catch(() => (loading = null));
  }
  return loading;
}

const host = (e: Event) => (e.target as Element | null)?.closest?.("santander-calc") as Calc | null;

// Warm up on intent, open on click.
for (const type of ["pointerover", "focusin", "touchstart"]) {
  document.addEventListener(type, (e) => host(e) && void load(), { passive: true, capture: true });
}
document.addEventListener(
  "click",
  (e) => {
    const el = host(e);
    if (!el || customElements.get("santander-calc")) return;
    e.preventDefault();
    void load().then(() => el.open());
  },
  true,
);

interface DrawerConfig {
  selector: string;
  attrs: Record<string, string>;
  label: string;
}

/** Cart drawers can't host app blocks: put a button above their checkout button. */
function watchDrawer(cfg: DrawerConfig) {
  let queued = false;
  const place = () => {
    queued = false;
    document.querySelectorAll<HTMLElement>(cfg.selector).forEach((checkout) => {
      if (checkout.previousElementSibling?.matches("santander-calc[data-sc-drawer]")) return;
      const el = document.createElement("santander-calc");
      Object.entries(cfg.attrs).forEach(([k, v]) => v && el.setAttribute(k, v));
      el.setAttribute("data-sc-drawer", "");
      el.setAttribute("data-shopify-source", "cart");
      el.style.cssText = "display:block;margin-bottom:10px";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = cfg.label;
      btn.style.cssText = `width:100%;min-height:48px;border:0;border-radius:10px;background:${cfg.attrs.primary || "#ec0000"};color:#fff;font:inherit;font-weight:600;cursor:pointer`;
      el.appendChild(btn);
      checkout.before(el);
    });
  };
  // Drawers render lazily; batch DOM changes into one cheap lookup per frame.
  new MutationObserver(() => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(place);
    }
  }).observe(document.body, { childList: true, subtree: true });
  place();
}

function boot() {
  if (document.querySelector("santander-calc[mode='inline']")) void load();
  const cfg = document.getElementById("santander-calc-drawer");
  if (cfg?.textContent) {
    try {
      watchDrawer(JSON.parse(cfg.textContent));
    } catch (err) {
      console.error("[santander-calc] invalid drawer config", err);
    }
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
document.addEventListener("shopify:section:load", boot);

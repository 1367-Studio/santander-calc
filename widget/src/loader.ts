/**
 * Script-tag entry, drop-in compatible with v1:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/santander-calc/loader.js"
 *           data-total="1250" data-lang="fr"></script>
 *
 * Every v1 data-* attribute still works (total, lang, primary, bg, header-bg,
 * header-fg, btn-text, width, autoopen, embed). The widget now renders in
 * the page (Shadow DOM) instead of a full-screen iframe.
 */
import { define } from "./element.ts";

define();

const script = document.currentScript as HTMLScriptElement | null;
if (script) {
  const d = script.dataset;
  const el = document.createElement("santander-calc");
  const set = (attr: string, v: string | undefined) => {
    if (v != null && v !== "") el.setAttribute(attr, v);
  };
  set("amount", d.total);
  set("lang", d.lang);
  set("primary", d.primary);
  set("bg", d.bg);
  set("header-bg", d.headerBg);
  set("header-fg", d.headerFg);
  set("label", d.btnText);
  set("width", d.width ?? (d.embed === "true" ? "100%" : undefined));
  set("font", d.font);
  set("api", d.api);
  set("mode", d.embed === "true" ? "inline" : d.autoopen === "true" ? "open" : undefined);

  if (script.parentElement && script.parentElement !== document.head) script.after(el);
  else if (document.body) document.body.appendChild(el);
  else document.addEventListener("DOMContentLoaded", () => document.body.appendChild(el));
}

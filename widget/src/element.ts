import { buildSchedule, sortedTiers, tierForAmount } from "./calc.ts";
import { dateDmy, legalHtml, money, tierLabel } from "./format.ts";
import { resolveLang, STRINGS, type Strings } from "./i18n.ts";
import { isRateCard } from "./ratecard.ts";
import { css } from "./styles.ts";
import type { Lang, RateCard, Tier } from "./types.ts";

declare const __SC_API__: string;
/** Replaced at build time; the Vercel deployment that serves /api/rate-card. */
export const DEFAULT_API = typeof __SC_API__ === "string" ? __SC_API__ : "https://santander-calc.vercel.app";

const ICON_INFO = `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8.25" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="10" cy="6.4" r="1.05" fill="currentColor"/></svg>`;
const ICON_CLOSE = `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const ICON_CAL = `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.75" y="4" width="14.5" height="13.25" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M2.75 8h14.5M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

const cardCache = new Map<string, Promise<RateCard>>();

/** One request per rate-card URL per page, however many widgets are on it. */
export function loadRateCard(url: string): Promise<RateCard> {
  let p = cardCache.get(url);
  if (!p) {
    p = fetch(url, { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => (isRateCard(json) ? json : Promise.reject(new Error("Invalid rate card"))));
    p.catch(() => cardCache.delete(url)); // allow a retry on next open
    cardCache.set(url, p);
  }
  return p;
}

type Mode = "button" | "inline" | "open";

/**
 * <santander-calc amount="1250" lang="fr"></santander-calc>
 *
 * Attributes: amount, lang, mode (button | inline | open), label, primary,
 * bg, header-bg, header-fg, font, width, api, rate-card-url.
 * Properties: rateCard (inject data directly), resolveAmount (async () => number,
 * called on open — used by the Shopify adapter to read the live cart).
 * Events: santander-calc:open, santander-calc:close, santander-calc:change.
 */
export class SantanderCalcElement extends HTMLElement {
  static observedAttributes = ["amount", "lang", "mode", "label", "primary", "bg", "header-bg", "header-fg", "font", "width", "api", "rate-card-url"];

  // `declare`: no field initializer, so a value assigned before the element
  // upgrades (the Shopify adapter does this) isn't reset to undefined.
  declare resolveAmount?: () => Promise<number> | number;

  #root: ShadowRoot;
  #card: RateCard | null = null;
  #cardOverride: RateCard | null = null;
  #error = false;
  #amount = 0;
  #tier: Tier | null = null;
  #tierPinned = false;
  #isOpen = false;
  #restoreFocus: HTMLElement | null = null;
  #restoreOverflow = "";
  #debounce?: ReturnType<typeof setTimeout>;
  #noticeTimer?: ReturnType<typeof setTimeout>;
  #el!: Record<string, HTMLElement>;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  get lang(): Lang {
    return resolveLang(this.getAttribute("lang") || document.documentElement.lang);
  }
  get t(): Strings {
    return STRINGS[this.lang];
  }
  get mode(): Mode {
    const m = this.getAttribute("mode");
    return m === "inline" || m === "open" ? m : "button";
  }

  /** Inject a rate card directly (Studio preview, tests, offline use). */
  set rateCard(card: RateCard | null) {
    this.#cardOverride = card;
    this.#card = card;
    this.#error = false;
    if (this.#el) this.#render();
  }
  get rateCard(): RateCard | null {
    return this.#card;
  }

  connectedCallback() {
    if (!this.#el) this.#build();
    this.#applyTheme();
    this.#amount = parseAmount(this.getAttribute("amount"));
    if (this.mode === "inline") this.#mountInline();
    else if (this.mode === "open") void this.open();
  }

  disconnectedCallback() {
    if (this.#isOpen) this.#teardownModal();
  }

  attributeChangedCallback(name: string, oldV: string | null, newV: string | null) {
    if (!this.#el || oldV === newV) return;
    if (name === "amount") {
      this.#amount = parseAmount(newV);
      this.#tierPinned = false;
      this.#render();
    } else if (name === "api" || name === "rate-card-url") {
      if (!this.#cardOverride) this.#card = null;
      if (this.#isOpen || this.mode === "inline") void this.#ensureCard().then(() => this.#render());
    } else if (name === "lang" || name === "label") {
      this.#renderStatic();
      this.#render();
    } else {
      this.#applyTheme();
    }
  }

  async open() {
    if (this.mode === "inline") return;
    if (this.resolveAmount) {
      try {
        const v = await this.resolveAmount();
        if (Number.isFinite(v)) this.#amount = v;
        this.#tierPinned = false;
      } catch {
        /* keep the attribute amount */
      }
    }
    if (!this.#isOpen) this.#showModal();
    await this.#ensureCard();
    this.#render();
    this.dispatchEvent(new CustomEvent("santander-calc:open", { bubbles: true, composed: true }));
  }

  close() {
    if (!this.#isOpen || this.mode === "inline") return;
    const overlay = this.#el.overlay;
    overlay.classList.add("is-closing");
    const done = () => this.#teardownModal();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) done();
    else setTimeout(done, 170);
    this.dispatchEvent(new CustomEvent("santander-calc:close", { bubbles: true, composed: true }));
  }

  /* ── DOM ───────────────────────────────────────────────────────────── */

  #build() {
    this.#root.innerHTML = `
      <style>${css}</style>
      <button class="trigger" part="button" type="button" aria-haspopup="dialog">${ICON_CAL}<span class="trigger-text"></span></button>
      <div class="overlay" part="overlay" hidden></div>
      <section class="panel" part="panel" role="dialog" aria-modal="true" aria-labelledby="sc-title" tabindex="-1">
        <div class="warning" role="note">${ICON_INFO}<span class="warning-text"></span></div>
        <header class="head" part="header">
          <h2 class="title" id="sc-title"></h2>
          <button class="close" type="button">${ICON_CLOSE}</button>
        </header>
        <div class="body">
          <div>
            <label class="label amount-label" for="sc-amount"></label>
            <div class="amount">
              <input id="sc-amount" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="0">
              <span class="cur" aria-hidden="true">€</span>
            </div>
          </div>
          <div class="limit-field">
            <span class="label limit-label" id="sc-limit-label"></span>
            <div class="segmented" role="radiogroup" aria-labelledby="sc-limit-label"></div>
            <p class="notice" role="status" hidden></p>
          </div>
          <div class="result" aria-live="polite">
            <p class="teaser"></p>
            <div class="stats">
              <div class="stat stat--primary"><span class="stat-label first-label"></span><span class="stat-value first-value">—</span></div>
              <div class="stat"><span class="stat-label months-label"></span><span class="stat-value months-value">—</span></div>
            </div>
            <svg class="chart" role="img" preserveAspectRatio="none"></svg>
            <div class="table-wrap" tabindex="0">
              <table><thead><tr><th class="col-months" scope="col"></th><th class="col-amount" scope="col"></th></tr></thead><tbody></tbody></table>
            </div>
            <p class="message" hidden></p>
          </div>
          <p class="fineprint rounding"></p>
          <div class="legal"></div>
          <p class="fineprint stamp"></p>
        </div>
      </section>`;

    const q = <T extends HTMLElement = HTMLElement>(s: string) => this.#root.querySelector(s) as T;
    this.#el = {
      trigger: q(".trigger"),
      triggerText: q(".trigger-text"),
      overlay: q(".overlay"),
      panel: q(".panel"),
      warning: q(".warning-text"),
      title: q(".title"),
      close: q(".close"),
      amountLabel: q(".amount-label"),
      input: q("input"),
      limitField: q(".limit-field"),
      limitLabel: q(".limit-label"),
      segmented: q(".segmented"),
      notice: q(".notice"),
      teaser: q(".teaser"),
      stats: q(".stats"),
      firstLabel: q(".first-label"),
      firstValue: q(".first-value"),
      monthsLabel: q(".months-label"),
      monthsValue: q(".months-value"),
      chart: q(".chart") as unknown as HTMLElement,
      tableWrap: q(".table-wrap"),
      tbody: q("tbody"),
      colMonths: q(".col-months"),
      colAmount: q(".col-amount"),
      message: q(".message"),
      rounding: q(".rounding"),
      legal: q(".legal"),
      stamp: q(".stamp"),
    };
    this.#el.panel.remove(); // lives in the overlay (modal) or the shadow root (inline)

    this.#el.trigger.addEventListener("click", () => void this.open());
    this.#el.close.addEventListener("click", () => this.close());
    this.#el.overlay.addEventListener("mousedown", (e) => {
      if (e.target === this.#el.overlay) this.close();
    });
    this.#el.panel.addEventListener("keydown", (e) => this.#onKeydown(e));
    this.#el.input.addEventListener("input", () => {
      clearTimeout(this.#debounce);
      this.#debounce = setTimeout(() => {
        const v = parseAmount((this.#el.input as HTMLInputElement).value);
        this.#amount = v;
        this.#render({ fromInput: true });
      }, 180);
    });
    this.#el.input.addEventListener("blur", () => {
      if (this.#amount > 0) (this.#el.input as HTMLInputElement).value = formatInput(this.lang, this.#amount);
    });
    this.#el.segmented.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".seg");
      if (!btn || btn.disabled || !this.#card) return;
      this.#tier = this.#card.tiers.find((t) => t.id === btn.dataset.id) ?? null;
      this.#tierPinned = true;
      this.#render();
    });
    this.#el.segmented.addEventListener("keydown", (e) => this.#onRadioKey(e));

    this.#renderStatic();
  }

  #renderStatic() {
    const t = this.t;
    const c = this.#card?.content?.[this.lang];
    this.#el.triggerText.textContent = this.getAttribute("label") || t.button;
    this.#el.warning.textContent = c?.warning || t.warning;
    this.#el.title.textContent = c?.title || t.title;
    this.#el.close.setAttribute("aria-label", t.close);
    this.#el.amountLabel.textContent = t.amountLabel;
    this.#el.limitLabel.textContent = t.creditLimitLabel;
    this.#el.firstLabel.textContent = t.statFirst;
    this.#el.monthsLabel.textContent = t.statMonths;
    this.#el.colMonths.textContent = t.colMonths;
    this.#el.colAmount.textContent = t.colAmount;
    this.#el.rounding.textContent = t.roundingNote;
    this.#el.chart.setAttribute("aria-label", t.chartLabel);
  }

  #applyTheme() {
    const map: Record<string, string> = { primary: "--sc-primary", bg: "--sc-bg", "header-bg": "--sc-header-bg", "header-fg": "--sc-header-fg", font: "--sc-font" };
    for (const [attr, prop] of Object.entries(map)) {
      let v = this.getAttribute(attr);
      if (v && attr !== "font" && /^[0-9a-f]{3,8}$/i.test(v)) v = `#${v}`; // v1 accepted colors without "#"
      if (v) this.style.setProperty(prop, v);
      else this.style.removeProperty(prop);
    }
    const width = this.getAttribute("width");
    if (width && width !== "auto") {
      this.style.width = width;
      this.toggleAttribute("data-block", true);
    }
  }

  async #ensureCard() {
    if (this.#cardOverride) this.#card = this.#cardOverride;
    if (this.#card) return;
    const url = this.getAttribute("rate-card-url") || `${(this.getAttribute("api") || DEFAULT_API).replace(/\/$/, "")}/api/rate-card`;
    if (url === "none") return; // data is injected through the rateCard property
    try {
      const card = await loadRateCard(url);
      if (this.#cardOverride) return; // injected while we were fetching — it wins
      this.#card = card;
      this.#error = false;
      this.#renderStatic(); // content overrides may change the warning/title
    } catch (err) {
      console.error("[santander-calc] could not load rates:", err);
      this.#error = true;
    }
  }

  #mountInline() {
    this.#el.trigger.hidden = true;
    this.#root.appendChild(this.#el.panel);
    this.#el.panel.removeAttribute("aria-modal");
    this.#el.panel.setAttribute("role", "region");
    void this.#ensureCard().then(() => this.#render());
  }

  #showModal() {
    this.#isOpen = true;
    this.#restoreFocus = (document.activeElement as HTMLElement) ?? null;
    this.#el.overlay.appendChild(this.#el.panel);
    this.#el.overlay.classList.remove("is-closing");
    this.#el.overlay.hidden = false;
    if (this.mode === "open") this.#el.trigger.hidden = true;
    this.#restoreOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    this.#render();
    requestAnimationFrame(() => (this.#amount > 0 ? this.#el.panel : this.#el.input).focus({ preventScroll: true }));
  }

  #teardownModal() {
    this.#isOpen = false;
    this.#el.overlay.hidden = true;
    this.#el.overlay.classList.remove("is-closing");
    document.documentElement.style.overflow = this.#restoreOverflow;
    if (this.mode === "open") {
      this.#el.trigger.hidden = true;
    }
    this.#restoreFocus?.focus?.({ preventScroll: true });
  }

  #onKeydown(e: KeyboardEvent) {
    if (this.mode === "inline") return;
    if (e.key === "Escape") {
      e.stopPropagation();
      this.close();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = [...this.#el.panel.querySelectorAll<HTMLElement>("button:not([disabled]), input, [tabindex='0']")].filter(
      (n) => !n.closest("[hidden]") && n.offsetParent !== null,
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = this.#root.activeElement;
    if (e.shiftKey && (active === first || !this.#el.panel.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  #onRadioKey(e: KeyboardEvent) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    const radios = [...this.#el.segmented.querySelectorAll<HTMLButtonElement>(".seg:not(:disabled)")];
    const i = radios.indexOf(this.#root.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    const next = radios[(i + (e.key === "ArrowLeft" || e.key === "ArrowUp" ? radios.length - 1 : 1)) % radios.length];
    next.focus();
    next.click();
  }

  /* ── Rendering ─────────────────────────────────────────────────────── */

  #render(opts: { fromInput?: boolean } = {}) {
    if (!this.#el || (!this.#isOpen && this.mode !== "inline")) return;
    const t = this.t;
    const lang = this.lang;
    const card = this.#card;
    const amount = this.#amount;

    if (!opts.fromInput && this.#root.activeElement !== this.#el.input) {
      (this.#el.input as HTMLInputElement).value = amount > 0 ? formatInput(lang, amount) : "";
    }

    if (!card) {
      this.#el.limitField.hidden = true;
      return this.#showMessage(this.#error ? t.unavailable : "", { hideLegal: true });
    }
    this.#el.limitField.hidden = false;

    // Tier: auto-pick the smallest that covers the amount, unless the visitor
    // chose a bigger one themselves. A tier below the amount is never allowed.
    const previous = this.#tier;
    if (!previous || !this.#tierPinned || previous.limitMax < amount) {
      const next = amount > 0 ? tierForAmount(card, amount) : sortedTiers(card)[0];
      if (previous && next && previous.id !== next.id && (this.#tierPinned || opts.fromInput)) {
        this.#flashNotice(t.creditLimitChanged(tierLabel(lang, next)));
      }
      this.#tier = next;
      this.#tierPinned = false;
    }
    this.#renderTiers(card, amount);

    if (!(amount > 0)) {
      return this.#showMessage(this.resolveAmount ? t.emptyCart : "", { hideLegal: false });
    }
    if (!this.#tier) return this.#showMessage(t.tooHigh, { hideLegal: true });

    const tier = this.#tier;
    const { payments, truncated } = buildSchedule(amount, tier);
    if (truncated || !payments.length) return this.#showMessage(t.unavailable, { hideLegal: true });

    this.#el.message.hidden = true;
    this.#el.teaser.hidden = false;
    this.#el.stats.hidden = false;
    this.#el.tableWrap.hidden = false;
    this.#el.chart.removeAttribute("hidden");
    this.#el.teaser.textContent = t.teaser(money(lang, payments[0]).replace(" €", "€"));
    this.#el.firstValue.textContent = money(lang, payments[0]);
    this.#el.monthsValue.textContent = String(payments.length);
    this.#el.tbody.innerHTML = payments.map((p, i) => `<tr><td>${i + 1}</td><td>${money(lang, p)}</td></tr>`).join("");
    this.#renderChart(payments);
    this.#renderLegal(card, tier);

    this.dispatchEvent(
      new CustomEvent("santander-calc:change", {
        bubbles: true,
        composed: true,
        detail: { amount, tier: tier.id, firstPayment: payments[0], months: payments.length },
      }),
    );
  }

  #renderTiers(card: RateCard, amount: number) {
    const lang = this.lang;
    const tiers = sortedTiers(card);
    this.#el.segmented.innerHTML = tiers
      .map((tier) => {
        const checked = tier.id === this.#tier?.id;
        const disabled = amount > 0 && tier.limitMax < amount;
        return `<button type="button" class="seg" role="radio" data-id="${tier.id}" aria-checked="${checked}" tabindex="${checked ? 0 : -1}" ${disabled ? "disabled" : ""}>${tierLabel(lang, tier)}</button>`;
      })
      .join("");
    this.#el.limitField.hidden = tiers.length < 2;
  }

  #renderChart(payments: number[]) {
    const svg = this.#el.chart;
    const n = payments.length;
    const max = Math.max(...payments);
    const W = 600;
    const H = 56;
    const gap = n > 80 ? 1 : 2;
    const bw = (W - gap * (n - 1)) / n;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = payments
      .map((p, i) => {
        const h = Math.max(2, (p / max) * H);
        return `<rect x="${(i * (bw + gap)).toFixed(2)}" y="${(H - h).toFixed(2)}" width="${bw.toFixed(2)}" height="${h.toFixed(2)}" rx="${Math.min(2, bw / 2).toFixed(2)}"/>`;
      })
      .join("");
  }

  #renderLegal(card: RateCard, tier: Tier) {
    this.#el.legal.hidden = false;
    this.#el.legal.innerHTML = `<p>${legalHtml(this.lang, card, tier)}</p>`;
    this.#el.rounding.hidden = false;
    this.#el.stamp.hidden = false;
    this.#el.stamp.textContent = `${this.t.dateLabel}: ${dateDmy(this.lang, new Date())}`;
  }

  #showMessage(text: string, { hideLegal }: { hideLegal: boolean }) {
    this.#el.teaser.hidden = true;
    this.#el.stats.hidden = true;
    this.#el.tableWrap.hidden = true;
    this.#el.chart.setAttribute("hidden", "");
    this.#el.message.hidden = !text;
    this.#el.message.textContent = text;
    if (hideLegal || !this.#card || !this.#tier) this.#el.legal.hidden = true;
    else this.#renderLegal(this.#card, this.#tier);
    this.#el.rounding.hidden = true;
    this.#el.stamp.hidden = true;
  }

  #flashNotice(text: string) {
    const el = this.#el.notice;
    el.textContent = text;
    el.hidden = true;
    void el.offsetWidth; // restart the animation
    el.hidden = false;
    clearTimeout(this.#noticeTimer);
    this.#noticeTimer = setTimeout(() => (el.hidden = true), 4000);
  }
}

function parseAmount(v: string | null | undefined): number {
  if (!v) return 0;
  const s = String(v).replace(/[\s €]/g, "");
  // Accept "1.234,56", "1,234.56", "1234,5", "1234.5"; "1,250" / "1.250" are thousands.
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ""));
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let n: string = s;
  if (lastComma > lastDot) n = s.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma && lastComma >= 0) n = s.replace(/,/g, "");
  const num = Number(n);
  return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : 0;
}

function formatInput(lang: Lang, n: number): string {
  return n.toLocaleString(lang, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

export function define(tag = "santander-calc") {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) customElements.define(tag, SantanderCalcElement);
}

"use strict";

/**
 * Santander — Revolving Credit Calculator (Shopify)
 * -------------------------------------------------
 * This file powers the revolving-credit (a.k.a. flexible / open-ended) schedule modal.
 *
 * ✅ What it does:
 * - Injects a "See schedule" button next to the checkout button in the cart drawer.
 * - Opens a modal that shows a month-by-month repayment schedule based on JSON rules.
 * - Supports *two* rule formats:
 *   1) NEW: 3 separate JSON files with "bands" arrays (preferred going forward).
 *   2) LEGACY: a single JSON with "tabs" and RLE schedules (still supported).
 * - Chooses the correct range/tab for the current cart total, and renders only that tab.
 * - Shows a legal disclaimer paragraph at the bottom.
 *
 * 🌍 Translated legal text:
 * - We now support dynamic, translated legal text in FR/EN/NL/DE via `legalTpl` in the i18n object.
 * - You can control whether to use the translated `legalTpl` **or** the legal text coming from the JSON (`legal_lines`)
 *   with a data-attribute:
 *
 *     data-use-i18n-legal="true"   -> force translated i18n legal (ignore JSON `legal_lines`)
 *     data-use-i18n-legal="false"  -> keep/allow JSON `legal_lines` if present
 *
 *   This gives you a switch without breaking any existing merchant data.
 *
 * 🧩 How to turn translated legal ON in your Liquid snippet:
 *   <div
 *     id="santander-revolving-root-{{ block.id }}"
 *     ...
 *     data-use-i18n-legal="true"
 *   ></div>
 *
 * 🔧 Notes for developers:
 * - We try very hard not to break existing logic. Any merchant with old JSONs should still work.
 * - If all three "new" JSONs load, we normalize them into tabs A/B/C. If not, we fall back to the legacy file.
 * - The applied tab/range is stored to localStorage (useful for debugging or styling).
 */

/* ========================================================================== */
/* =                               Utilities                                = */
/* ========================================================================== */

/**
 * Format a number in a given language with 2 fractional digits.
 * Example: SR_FMT('fr', 1234.5) -> "1 234,50"
 */
const SR_FMT = (lang, n) =>
  Number(n).toLocaleString(lang || "fr", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Expand legacy RLE schedules (Run-Length Encoding) into a flat array of amounts.
 * Example: [[3, 25], [1, 12.5]] -> [25, 25, 25, 12.5]
 */
const expandRLE = (rle) => {
  const out = [];
  (rle || []).forEach(([count, val]) => {
    for (let i = 0; i < count; i++) out.push(val);
  });
  return out;
};

/**
 * Expand the NEW "bands" format into a flat array of amounts (one entry per month).
 * Each step is { months: number | "final", amount: number }.
 * We ignore "final" here because it is handled later to fill the rest up to the total.
 */
const expandBands = (bands) => {
  const out = [];
  for (const step of bands || []) {
    if (step.months === "final") continue;
    const months = Number(step.months) || 0;
    for (let i = 0; i < months; i++) out.push(step.amount);
  }
  return out;
};

/**
 * Allow bold "chips" inside a legal sentence using [[...]].
 * We wrap them in a <span> to emphasize those parts visually.
 */
const formatLegalText = (text) => {
  if (!text) return "";
  return text.replace(
    /\[\[(.*?)\]\]/g,
    '<span style="font-weight: bold; font-size: 16px; line-height: 19px">$1</span>',
  );
};

/* ========================================================================== */
/* =                           Main Component                                = */
/* ========================================================================== */

class RevolvingCalc {
  constructor(root) {
    /** Root element for this calculator instance */
    this.root = root;

    /** Modal element (created at runtime) */
    this.modal = null;

    /** The normalized "rules" object produced by either new or legacy loader */
    this.rules = null;

    /** The finalized array of tabs derived from the rules */
    this.tabs = [];

    /** Index of the active tab/range for current total */
    this.activeTabIdx = 0;

    /** Tabs actually shown (we only show the one matching the cart total) */
    this.visibleTabs = [];
    this.currentTabs = [];

    /* ------------------------- Config via data-attrs ---------------------- */
    // If this is an inline block, try to inherit settings from cart embed
    const isInlineBlock = root.dataset.inlineBlock === "true";
    const cartEmbed = document.getElementById("santander-revolving-cart-embed");
    
    if (isInlineBlock && cartEmbed) {
      // Inherit settings from cart embed
      this.lang = cartEmbed.dataset.language || "fr";
      this.primary = cartEmbed.dataset.primaryColor || "#e60000";
      this.bg = cartEmbed.dataset.bgColor || "#ffffff";
      this.headerBg = cartEmbed.dataset.headerBg || this.primary;
      this.headerFg = cartEmbed.dataset.headerFg || "#ffffff";
    } else {
      // Use own settings or defaults
      this.lang = root.dataset.language || "fr";
      this.primary = root.dataset.primaryColor || "#e60000";
      this.bg = root.dataset.bgColor || "#ffffff";
      this.headerBg = root.dataset.headerBg || this.primary;
      this.headerFg = root.dataset.headerFg || "#ffffff";
    }

    // Toggle: force translated legal (ignore JSON `legal_lines`) if true
    this.useI18nLegal = root.dataset.useI18nLegal === "true";

    const routesRoot = window.Shopify?.routes?.root
      ? window.Shopify.routes.root
      : "";

    // Legacy one-file rules URL (still supported)
    this.rulesUrl =
      root.dataset.revolvingRulesUrl ||
      root.dataset.revolvingRatesUrl ||
      (routesRoot
        ? `${routesRoot}assets/revolvingRates.json`
        : "/assets/revolvingRates.json");

    // New 3-file layout; can be overridden via data-attrs
    const assetsBase = routesRoot ? `${routesRoot}assets/` : "/assets/";
    this.files = {
      A:
        root.dataset.revolvingFileA || `${assetsBase}revolving_bands_1250.json`,
      B:
        root.dataset.revolvingFileB ||
        `${assetsBase}revolving_bands_1250_5000.json`,
      C:
        root.dataset.revolvingFileC ||
        `${assetsBase}revolving_bands_5000_plus.json`,
    };

    this.renderInline = root.dataset.renderInline === "true";
    this.fullWidthButton = root.dataset.fullWidthButton === "true";
    this.cartEmbed = root.dataset.cartEmbed === "true";

    /** i18n dictionary (labels + legal templates) */
    this.t = this.i18n(this.lang);

    /* ------------------------- Boot sequence ----------------------------- */
    this.applyThemeVars();
    
    // If cart embed is enabled, only install cart button
    if (this.cartEmbed) {
      this.installCartButton();
    }
    
    // If inline rendering is enabled, only install inline button
    if (this.renderInline) {
      this.installInlineButton();
    }
    
    // If neither is explicitly set, install cart button (backward compatibility)
    if (!this.cartEmbed && !this.renderInline) {
      this.installCartButton();
    }
    
    this.createModal();
  }

  /* ====================================================================== */
  /* =                          I18N & Legal                              = */
  /* ====================================================================== */

  /**
   * i18n dictionary with:
   * - static labels for UI
   * - tab labels for range badges
   * - legalTpl: templates to build a translated legal sentence dynamically
   */
  i18n(l) {
    const d = {
      fr: {
        headerBanner:
          "Attention, emprunter de l’argent coûte aussi de l’argent.",
        appliedRange: (label) => `Tranche appliquée : ${label}`,
        scheduleTitle: "Crédit renouvelable",
        colMonths: "Mois",
        colToRepay: "Somme",
        dateLabel: "Date de ce calcul",
        teaser: (amt) => `Ou à partir de ${amt}/mois avec paiement échelonné.`,
        overview: (total) =>
          `vue d'ensemble de budget pour un enregistrement unique de ${total} €`,
        seeScheduleBtn: "Voir l’échéancier",
        emptyCart:
          "Votre panier est vide. Ajoutez des articles pour voir un échéancier.",
        tooHigh: "Montant supérieur au plafond configuré.",
        tabA: "≤ 1 250 €",
        tabB: "1 250–5 000 €",
        tabC: "≥ 5 001 €",
        legalTpl: {
          single: ({ amount, aprRep, aprNom, feeMonthly, date }) =>
            `Pour une [[ouverture de crédit à durée indéterminée]] de [[${amount}]] avec un [[Taux Annuel Effectif Global (TAEG)]] de [[${aprRep}%]] (taux débiteur variable : ${aprNom}% et frais de carte ${feeMonthly}% par mois du capital restant dû). Taux valable au ${date}.`,
          between: ({ min, max, aprRep, aprNom, feeMonthly, date }) =>
            `Pour une [[ouverture de crédit à durée indéterminée]] entre [[${min}]] et [[${max}]] avec un [[Taux Annuel Effectif Global (TAEG)]] de [[${aprRep}%]] (taux débiteur variable : ${aprNom}% et frais de carte ${feeMonthly}% par mois du capital restant dû). Taux valable au ${date}.`,
          min: ({ min, aprRep, aprNom, feeMonthly, date }) =>
            `Pour une [[ouverture de crédit à durée indéterminée]] de [[${min}]] et plus avec un [[Taux Annuel Effectif Global (TAEG)]] de [[${aprRep}%]] (taux débiteur variable : ${aprNom}% et frais de carte ${feeMonthly}% par mois du capital restant dû). Taux valable au ${date}.`,
        },
        dateSep: "/",
      },

      en: {
        headerBanner: "Warning: borrowing money also costs money.",
        appliedRange: (label) => `Applied range: ${label}`,
        scheduleTitle: "Revolving credit",
        colMonths: "Months",
        colToRepay: "Amount",
        dateLabel: "Date of this calculation",
        teaser: (amt) => `Or from ${amt}/month with instalments.`,
        overview: (total) =>
          `budget overview for a single registration of €${total}`,
        seeScheduleBtn: "See schedule",
        emptyCart: "Your cart is empty. Add items to see a schedule.",
        tooHigh: "Amount above the configured ceiling.",
        tabA: "≤ €1,250",
        tabB: "€1,250–€5,000",
        tabC: "≥ €5,001",
        legalTpl: {
          single: ({ amount, aprRep, aprNom, feeMonthly, date }) =>
            `For an [[open-ended credit line]] of [[${amount}]] with an [[Annual Percentage Rate (APR)]] of [[${aprRep}%]] (variable borrowing rate: ${aprNom}% and card fee ${feeMonthly}% per month on the outstanding balance). Rate valid on ${date}.`,
          between: ({ min, max, aprRep, aprNom, feeMonthly, date }) =>
            `For an [[open-ended credit line]] between [[${min}]] and [[${max}]] with an [[Annual Percentage Rate (APR)]] of [[${aprRep}%]] (variable borrowing rate: ${aprNom}% and card fee ${feeMonthly}% per month on the outstanding balance). Rate valid on ${date}.`,
          min: ({ min, aprRep, aprNom, feeMonthly, date }) =>
            `For an [[open-ended credit line]] of [[${min}]] or more with an [[Annual Percentage Rate (APR)]] of [[${aprRep}%]] (variable borrowing rate: ${aprNom}% and card fee ${feeMonthly}% per month on the outstanding balance). Rate valid on ${date}.`,
        },
        dateSep: "/",
      },

      nl: {
        headerBanner: "Let op, geld lenen kost ook geld.",
        appliedRange: (label) => `Toegepaste schijf: ${label}`,
        scheduleTitle: "Doorlopend krediet",
        colMonths: "Maanden",
        colToRepay: "Bedrag",
        dateLabel: "Datum van deze berekening",
        teaser: (amt) => `Of vanaf ${amt}/maand met gespreid betalen.`,
        overview: (total) =>
          `budgetoverzicht voor een eenmalige registratie van €${total}`,
        seeScheduleBtn: "Schema bekijken",
        emptyCart:
          "Uw winkelwagen is leeg. Voeg items toe om een schema te zien.",
        tooHigh: "Bedrag boven de ingestelde limiet.",
        tabA: "≤ €1.250",
        tabB: "€1.250–€5.000",
        tabC: "≥ €5.001",
        legalTpl: {
          single: ({ amount, aprRep, aprNom, feeMonthly, date }) =>
            `Voor een [[doorlopend krediet]] van [[${amount}]] met een [[Jaarlijks Kostenpercentage (JKP)]] van [[${aprRep}%]] (variabele debetrente ${aprNom}% en kaartkosten ${feeMonthly}% per maand op het openstaand saldo). Tarief geldig op ${date}.`,
          between: ({ min, max, aprRep, aprNom, feeMonthly, date }) =>
            `Voor een [[doorlopend krediet]] tussen [[${min}]] en [[${max}]] met een [[Jaarlijks Kostenpercentage (JKP)]] van [[${aprRep}%]] (variabele debetrente ${aprNom}% en kaartkosten ${feeMonthly}% per maand op het openstaand saldo). Tarief geldig op ${date}.`,
          min: ({ min, aprRep, aprNom, feeMonthly, date }) =>
            `Voor een [[doorlopend krediet]] van [[${min}]] of meer met een [[Jaarlijks Kostenpercentage (JKP)]] van [[${aprRep}%]] (variabele debetrente ${aprNom}% en kaartkosten ${feeMonthly}% per maand op het openstaand saldo). Tarief geldig op ${date}.`,
        },
        dateSep: "/",
      },

      de: {
        headerBanner: "Achtung: Geld leihen kostet ebenfalls Geld.",
        appliedRange: (label) => `Angewendete Spanne: ${label}`,
        scheduleTitle: "Rahmenkredit",
        colMonths: "Monate",
        colToRepay: "Betrag",
        dateLabel: "Datum dieser Berechnung",
        teaser: (amt) => `Oder ab ${amt}/Monat mit Ratenzahlung.`,
        overview: (total) =>
          `Budgetübersicht für eine einmalige Buchung von €${total}`,
        seeScheduleBtn: "Plan anzeigen",
        emptyCart:
          "Ihr Warenkorb ist leer. Fügen Sie Artikel hinzu, um einen Plan zu sehen.",
        tooHigh: "Betrag über dem konfigurierten Limit.",
        tabA: "≤ 1.250 €",
        tabB: "1.250–5.000 €",
        tabC: "≥ 5.001 €",
        legalTpl: {
          single: ({ amount, aprRep, aprNom, feeMonthly, date }) =>
            `Für eine [[unbefristete Kreditlinie]] von [[${amount}]] mit einem [[effektiven Jahreszins (APR)]] von [[${aprRep}%]] (variabler Sollzinssatz: ${aprNom}% und Kartenentgelt ${feeMonthly}% pro Monat auf den offenen Saldo). Zinssatz gültig am ${date}.`,
          between: ({ min, max, aprRep, aprNom, feeMonthly, date }) =>
            `Für eine [[unbefristete Kreditlinie]] zwischen [[${min}]] und [[${max}]] mit einem [[effektiven Jahreszins (APR)]] von [[${aprRep}%]] (variabler Sollzinssatz: ${aprNom}% und Kartenentgelt ${feeMonthly}% pro Monat auf den offenen Saldo). Zinssatz gültig am ${date}.`,
          min: ({ min, aprRep, aprNom, feeMonthly, date }) =>
            `Für eine [[unbefristete Kreditlinie]] ab [[${min}]] mit einem [[effektiven Jahreszins (APR)]] von [[${aprRep}%]] (variabler Sollzinssatz: ${aprNom}% und Kartenentgelt ${feeMonthly}% pro Monat auf den offenen Saldo). Zinssatz gültig am ${date}.`,
        },
        dateSep: ".",
      },
    };
    return d[l] || d.fr;
  }

  /* ====================================================================== */
  /* =                       Formatting helpers                           = */
  /* ====================================================================== */

  /** Pick a locale for number/currency formatting based on app language. */
  getLocaleFromLang(lang) {
    if (lang === "fr") return "fr-BE";
    if (lang === "nl") return "nl-BE";
    if (lang === "de") return "de-DE";
    return "en-GB";
  }

  /** Currency with 0 decimals (for ranges like "≤ €1,250") */
  formatIntCurrency(amount) {
    return new Intl.NumberFormat(this.getLocaleFromLang(this.lang), {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /** Turn fraction (0.1349) into percent string ("13.49") respecting locale. */
  formatPercent(fraction, digits = 2) {
    const n = (Number(fraction) || 0) * 100;
    return new Intl.NumberFormat(this.getLocaleFromLang(this.lang), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n);
  }

  /** Simple dd/mm/yyyy (or dd.mm.yyyy for DE) date formatter. */
  formatDateDmy(d = new Date()) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return this.t.dateSep === "."
      ? `${dd}.${mm}.${yyyy}`
      : `${dd}/${mm}/${yyyy}`;
  }

  /* ====================================================================== */
  /* =                         Theming / Styles                           = */
  /* ====================================================================== */

  /** Push color config into CSS variables so themes can style via data-attrs. */
  applyThemeVars() {
    const r = document.documentElement;
    r.style.setProperty("--sr-primary", this.primary);
    r.style.setProperty("--sr-bg", this.bg);
    r.style.setProperty("--sr-header-bg", this.headerBg);
    r.style.setProperty("--sr-header-fg", this.headerFg);
  }

  /* ====================================================================== */
  /* =                    Cart Button (drawer injection)                  = */
  /* ====================================================================== */

  /**
   * Insert our "See schedule" button near the checkout button in the cart area.
   * Uses a MutationObserver to handle lazy-loaded drawers.
   * Button is singleton - only installed once even with multiple instances.
   */
  installCartButton() {
    // Prevent duplicate installations
    if (window.__SR_CartButtonInstalled) return;
    window.__SR_CartButtonInstalled = true;
    
    const insert = () => {
      const drawer =
        document.querySelector("[data-cart-drawer]") ||
        document.querySelector(".cart-drawer") ||
        document.querySelector("#CartDrawer") ||
        document.querySelector("#cart-drawer") ||
        document.body;

      const checkout =
        drawer.querySelector('[name="checkout"]') ||
        drawer.querySelector(".btn--checkout") ||
        drawer.querySelector(".cart__checkout") ||
        document.querySelector('form[action*="/cart"] [name="checkout"]');

      if (
        drawer &&
        checkout &&
        !document.getElementById("santander-revolving-btn")
      ) {
        const btn = document.createElement("button");
        btn.id = "santander-revolving-btn";
        btn.type = "button";
        btn.className = "btn sr-primary";
        btn.textContent = this.t.seeScheduleBtn;

        // visually match the checkout button
        const cs = getComputedStyle(checkout);
        Object.assign(btn.style, {
          height: cs.height !== "0px" ? cs.height : cs.minHeight,
          minHeight: cs.minHeight,
          borderRadius: cs.borderRadius,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          padding: cs.padding,
          letterSpacing: cs.letterSpacing,
          fontWeight: cs.fontWeight,
          borderWidth: cs.borderWidth,
          borderStyle: cs.borderStyle,
          borderColor: cs.borderColor,
          backgroundColor: this.primary,
          color: "#fff",
          margin: "10px 0 0 0",
          cursor: "pointer",
        });

        btn.addEventListener("click", () => this.open());
        checkout.parentNode.insertBefore(btn, checkout);
      }
    };

    new MutationObserver(insert).observe(document.body, {
      childList: true,
      subtree: true,
    });
    insert();
  }

  /* ====================================================================== */
  /* =                    Inline Button (block render)                    = */
  /* ====================================================================== */

  /**
   * Style the inline button to match a reference button (e.g., checkout or add-to-cart).
   * Uses the same approach as the cart drawer button for visual consistency.
   */
  installInlineButton() {
    const inlineBtn = this.root.querySelector(
      "#santander-revolving-btn-inline",
    );
    if (!inlineBtn) return;

    // Find a reference button to copy styles from
    const referenceBtn =
      document.querySelector('[name="checkout"]') ||
      document.querySelector('[name="add"]') ||
      document.querySelector('.btn--checkout') ||
      document.querySelector('.product-form__submit') ||
      document.querySelector('button[type="submit"]');

    if (referenceBtn) {
      // Copy computed styles from reference button
      const cs = getComputedStyle(referenceBtn);
      Object.assign(inlineBtn.style, {
        height: cs.height !== "0px" ? cs.height : cs.minHeight,
        minHeight: cs.minHeight,
        borderRadius: cs.borderRadius,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        padding: cs.padding,
        letterSpacing: cs.letterSpacing,
        fontWeight: cs.fontWeight,
        borderWidth: cs.borderWidth,
        borderStyle: cs.borderStyle,
        borderColor: cs.borderColor,
        backgroundColor: this.primary,
        color: "#fff",
        cursor: "pointer",
        display: this.fullWidthButton ? "block" : (cs.display || "inline-block"),
        textAlign: "center",
        textDecoration: "none",
        border: cs.border || "none",
        width: this.fullWidthButton ? "100%" : "auto",
        transition: "opacity 0.2s ease-in-out",
      });
    } else {
      // Fallback styling if no reference button is found
      Object.assign(inlineBtn.style, {
        backgroundColor: this.primary,
        color: "#fff",
        padding: "12px 24px",
        fontSize: "16px",
        fontWeight: "600",
        borderRadius: "4px",
        border: "none",
        cursor: "pointer",
        display: this.fullWidthButton ? "block" : "inline-block",
        textAlign: "center",
        textDecoration: "none",
        minHeight: "44px",
        width: this.fullWidthButton ? "100%" : "auto",
        transition: "opacity 0.2s ease-in-out",
      });
    }

    // Reveal the button after styling is applied
    requestAnimationFrame(() => {
      inlineBtn.style.visibility = "visible";
      inlineBtn.style.opacity = "1";
    });

    inlineBtn.addEventListener("click", () => this.open());
  }

  /* ====================================================================== */
  /* =                          Modal creation                            = */
  /* ====================================================================== */

  /**
   * Build the modal DOM (hidden by default). Tabs are shown/hidden dynamically;
   * but in practice we render only the tab that matches the cart total.
   * Modal is shared across all instances (singleton pattern).
   */
  createModal() {
    // Check if modal already exists (shared between instances)
    let m = document.getElementById("santander-revolving-modal");
    
    if (!m) {
      m = document.createElement("div");
      m.id = "santander-revolving-modal";
      m.className = "sr-modal";
      m.style.display = "none";
      m.innerHTML = `
        <div class="sr-modal__backdrop"></div>
        <div class="sr-modal__content sr-content--tall">
          <div class="header-banner"><span class="banner-text">${this.t.headerBanner}</span></div>
          <div class="sr-modal__header">
            <h3>${this.t.scheduleTitle}</h3>
            <button class="sr-modal__close" aria-label="Close">&times;</button>
          </div>
          <div class="sr-modal__body">
            <div class="sr-tabs">
              <div class="sr-tablist" role="tablist"></div>
            </div>
            <div class="sr-intro-top">
              <p class="sr-intro-head"></p>
              <p class="sr-intro-sub"></p>
              <p class="sr-applied-range" hidden></p>
            </div>
            <div class="sr-table-wrap">
              <table class="sr-table">
                <thead><tr><th>${this.t.colMonths}</th><th>${this.t.colToRepay}</th></tr></thead>
                <tbody class="sr-schedule-body"></tbody>
              </table>
            </div>
            <p class="sr-date-stamp"></p>
            <div class="sr-legal sr-legal--small sr-legal-dyn"></div>
          </div>
        </div>`;
      document.body.appendChild(m);
      
      m.querySelector(".sr-modal__close").addEventListener("click", () => {
        m.style.display = "none";
        document.body.classList.remove("sr-open");
      });
      m.querySelector(".sr-modal__backdrop").addEventListener("click", () => {
        m.style.display = "none";
        document.body.classList.remove("sr-open");
      });
    }
    
    this.modal = m;
  }

  /* ====================================================================== */
  /* =                            Open flow                               = */
  /* ====================================================================== */

  /**
   * Open the modal. We:
   * - read cart total from Shopify
   * - load (if needed) the rules (new 3-file or legacy)
   * - find the matching tab/range for the total
   * - render ONLY that tab
   */
  async open() {
    const total = await this.getCartTotal();
    if (!total || total <= 0) {
      this.renderEmpty(this.t.emptyCart);
      this.show();
      return;
    }

    try {
      if (!this.rules) {
        this.rules = await this.loadNewRulesOrLegacy();
        this.tabs = Array.isArray(this.rules.tabs) ? this.rules.tabs : [];
      }
    } catch (e) {
      console.error("[Revolving] rules load error:", e);
      this.renderEmpty("Indisponible pour l’instant.");
      this.show();
      return;
    }

    // Find the range/tab including this total
    this.activeTabIdx = this.tabs.findIndex(
      (t) =>
        total >= (t.range?.min ?? -Infinity) &&
        total <= (t.range?.max ?? Infinity),
    );

    if (this.activeTabIdx < 0) {
      this.renderEmpty(this.t.tooHigh);
      this.show();
      return;
    }

    // Only display the matching tab
    this.visibleTabs = [this.tabs[this.activeTabIdx]];
    this.currentTabs = this.visibleTabs.length ? this.visibleTabs : this.tabs;

    // Save and badge the selected range
    const selectedTab = this.tabs[this.activeTabIdx];
    this.saveActiveTab(selectedTab);
    this.updateAppliedRangeBadge(selectedTab);

    this.renderTabs(); // hides tab bar if only one tab
    this.renderSchedule(total, 0); // we only show index 0 of the visible set
    this.show();
  }

  /**
   * Try to load the 3 new JSONs in parallel. If at least one loads, normalize
   * them into our internal "tabs" shape. If none load, fall back to legacy file.
   */
  async loadNewRulesOrLegacy() {
    const urls = [this.files.A, this.files.B, this.files.C];
    const results = await Promise.allSettled(
      urls.map((u) => fetch(u, { cache: "no-store" })),
    );

    const okResponses = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) {
        try {
          okResponses.push(await r.value.json());
        } catch (_) {}
      }
    }

    if (okResponses.length >= 1) {
      // Normalize to a { tabs } object
      const tabs = okResponses
        .map((rule, idx) => ({
          id: rule.id || ["A", "B", "C"][idx] || `T${idx + 1}`,
          range: rule.range || {
            min: rule.min ?? 0,
            max: rule.max ?? Infinity,
          },
          // Per-language label for the range (fallback to A/B/C if unknown)
          label: {
            fr: [this.t.tabA, this.t.tabB, this.t.tabC][idx] || this.t.tabA,
            en: [this.t.tabA, this.t.tabB, this.t.tabC][idx] || this.t.tabA,
            nl: [this.t.tabA, this.t.tabB, this.t.tabC][idx] || this.t.tabA,
            de: [this.t.tabA, this.t.tabB, this.t.tabC][idx] || this.t.tabA,
          },
          bands: rule.bands || [],
          /**
           * IMPORTANT:
           * If we are forcing i18n legal, we ignore JSON `legal_lines` and leave legal blank.
           * If not forcing i18n, we keep the JSON legal (if present).
           */
          legal: this.useI18nLegal
            ? ""
            : formatLegalText(
                Array.isArray(rule.legal_lines)
                  ? rule.legal_lines.join(" ")
                  : rule.legal_lines || "",
              ),
          meta: {
            apr_nominal: rule.apr_nominal,
            apr_representative: rule.apr_representative,
            open_fee_monthly: rule.open_fee_monthly,
            valid_date: rule.valid_date, // optional date in JSON (e.g., "2025-05-27")
          },
        }))
        .sort((a, b) => (a.range?.min ?? 0) - (b.range?.min ?? 0));

      return { tabs };
    }

    // Fallback: legacy one-file JSON with `{ tabs: [...] }`
    const legacy = await fetch(this.rulesUrl, { cache: "no-store" });
    if (!legacy.ok) throw new Error(`HTTP ${legacy.status}`);
    return legacy.json();
  }

  /* ====================================================================== */
  /* =                         Modal show/hide                             = */
  /* ====================================================================== */

  show() {
    this.modal.style.display = "flex";
    document.body.classList.add("sr-open");
  }

  close() {
    this.modal.style.display = "none";
    document.body.classList.remove("sr-open");
  }

  /* ====================================================================== */
  /* =                          Render helpers                             = */
  /* ====================================================================== */

  /** Render an empty modal body with a message (e.g., empty cart, error). */
  renderEmpty(message) {
    this.modal.querySelector(".sr-tablist").innerHTML = "";
    this.modal.querySelector(".sr-intro-head").textContent =
      this.t.scheduleTitle;
    this.modal.querySelector(".sr-intro-sub").textContent = message || "";
    this.modal.querySelector(".sr-schedule-body").innerHTML = "";
    this.modal.querySelector(".sr-legal-dyn").innerHTML = "";
    this.modal.querySelector(".sr-date-stamp").textContent = "";
    const pill = this.modal.querySelector(".sr-applied-range");
    if (pill) pill.hidden = true;
  }

  /** Get the localized label for a tab/range. */
  getTabLabel(tab) {
    if (!tab) return "";
    const lbl = tab.label?.[this.lang];
    if (lbl) return lbl;
    const idx = this.tabs.indexOf(tab);
    return idx === 0 ? this.t.tabA : idx === 1 ? this.t.tabB : this.t.tabC;
  }

  /** Save active tab info (for CSS/telemetry) and localStorage. */
  saveActiveTab(tab) {
    try {
      const payload = {
        id: tab?.id ?? "",
        label: this.getTabLabel(tab),
        range: tab?.range ?? null,
      };
      localStorage.setItem(
        "santander:revolving:activeTab",
        JSON.stringify(payload),
      );
    } catch (_) {}
    this.root.setAttribute("data-sr-active-tab", tab?.id ?? "");
  }

  /** Update the little pill that displays "Applied range: …" */
  updateAppliedRangeBadge(tab) {
    const pill = this.modal.querySelector(".sr-applied-range");
    if (!pill) return;
    const label = this.getTabLabel(tab);
    pill.textContent = this.t.appliedRange(label);
    pill.hidden = !label;
  }

  /**
   * Render (or hide) the tab bar. In practice we hide it because we only show
   * the single range that matches the current cart total, but the component
   * still supports tab switching if you change `currentTabs`.
   */
  renderTabs() {
    const tabsWrap = this.modal.querySelector(".sr-tabs");
    const tablist = this.modal.querySelector(".sr-tablist");
    tablist.innerHTML = "";

    const arr = this.currentTabs || [];

    // Only one tab? Hide the bar completely.
    if (arr.length <= 1) {
      tabsWrap.style.display = "none";
      return;
    }

    tabsWrap.style.display = "";
    arr.forEach((tab, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sr-tab" + (i === 0 ? " is-active" : "");
      const label =
        tab.label?.[this.lang] ??
        (i === 0 ? this.t.tabA : i === 1 ? this.t.tabB : this.t.tabC);
      btn.textContent = label;
      btn.addEventListener("click", () => {
        this.modal
          .querySelectorAll(".sr-tab")
          .forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const chosen = arr[i];
        this.saveActiveTab(chosen);
        this.updateAppliedRangeBadge(chosen);
        this.getCartTotal().then((tot) => this.renderSchedule(tot, i));
      });
      tablist.appendChild(btn);
    });
  }

  /**
   * (Legacy helper) Choose a column from legacy JSON by purchase breakpoints.
   * Not used when we have "bands", but kept for back-compat.
   */
  pickColumn(tab /*, total */) {
    const cols = [...(tab.columns || [])].sort(
      (a, b) => a.purchase - b.purchase,
    );
    let chosen = cols.find((c) => c.purchase >= 0);
    if (!chosen) chosen = cols[cols.length - 1];
    return chosen;
  }

  /**
   * Build the legal paragraph.
   * - If `useI18nLegal` is FALSE and the tab provided `legal` (from JSON),
   *   we keep that legal (backward compatible).
   * - If `useI18nLegal` is TRUE, we ignore JSON legal and construct a localized
   *   sentence using the `legalTpl` template for the active language.
   */
  buildLegalFromTab(tab) {
    // Keep JSON legal only if we are NOT forcing i18n
    if (!this.useI18nLegal && tab.legal) return tab.legal;

    const range = tab.range || {};
    const meta = tab.meta || {};
    const aprRep = this.formatPercent(meta.apr_representative);
    const aprNom = this.formatPercent(meta.apr_nominal);
    const feeMonthly = this.formatPercent(meta.open_fee_monthly);
    const date = this.formatDateDmy(
      meta.valid_date ? new Date(meta.valid_date) : new Date(),
    );

    const tpl = this.t.legalTpl;

    // both bounds present (min & max): "between"
    if (Number.isFinite(range.min) && Number.isFinite(range.max)) {
      const minStr = this.formatIntCurrency(range.min);
      const maxStr = this.formatIntCurrency(range.max);
      return formatLegalText(
        tpl.between({
          min: minStr,
          max: maxStr,
          aprRep,
          aprNom,
          feeMonthly,
          date,
        }),
      );
    }

    // only max present (e.g., ≤ 1 250 €): "single"
    if (!Number.isFinite(range.min) && Number.isFinite(range.max)) {
      const amount = this.formatIntCurrency(range.max);
      return formatLegalText(
        tpl.single({ amount, aprRep, aprNom, feeMonthly, date }),
      );
    }

    // only min present (e.g., ≥ 5 001 €): "min"
    if (Number.isFinite(range.min) && !Number.isFinite(range.max)) {
      const displayMin = (Math.round(range.min) || 0) + 1;
      const minStr = this.formatIntCurrency(displayMin);
      return formatLegalText(
        tpl.min({ min: minStr, aprRep, aprNom, feeMonthly, date }),
      );
    }

    return "";
  }

  /**
   * Render the repayment schedule table and legal text for a given visible tab index.
   * - Builds the schedule from "bands" (new) or RLE (legacy).
   * - If the last band has "months": "final", we extend the schedule with the
   *   last step amount until the total is reached, then add the final remainder.
   */
  renderSchedule(total, tabIdx) {
    const arr =
      this.currentTabs && this.currentTabs.length
        ? this.currentTabs
        : this.tabs;
    const tab = arr[tabIdx];
    if (!tab) return this.renderEmpty("Indisponible.");

    // Save & badge for this tab
    this.saveActiveTab(tab);
    this.updateAppliedRangeBadge(tab);

    // Prefer new "bands"; otherwise use legacy RLE
    let schedule = [];
    if (Array.isArray(tab.bands) && tab.bands.length) {
      schedule = expandBands(tab.bands);
    } else if (tab.columns?.length) {
      const col = this.pickColumn(tab, total);
      schedule = expandRLE(col.rle);
    }

    // If there is a "final" band, top up with last step amount until near the total
    const sumPaid = schedule.reduce((a, b) => a + b, 0);
    const hasFinal =
      Array.isArray(tab.bands) &&
      tab.bands.length &&
      String(tab.bands[tab.bands.length - 1].months).toLowerCase() === "final";

    if (hasFinal && total > sumPaid) {
      // Find the last numeric step amount (fallback 25)
      let lastStepAmount = 25;
      for (let i = tab.bands.length - 2; i >= 0; i--) {
        if (typeof tab.bands[i].months === "number") {
          lastStepAmount = Number(tab.bands[i].amount) || 25;
          break;
        }
      }
      // Push extra months until we are close to total, then add remainder if needed
      let rest = +(total - sumPaid).toFixed(2);
      while (rest - lastStepAmount > 0.009) {
        schedule.push(lastStepAmount);
        rest = +(rest - lastStepAmount).toFixed(2);
      }
      if (rest > 0.009) schedule.push(+rest.toFixed(2));
    }

    /* ---------------------------- UI updates ---------------------------- */

    // Top teaser: "Or from X/month ..."
    const first = schedule[0] || 0;
    this.modal.querySelector(".sr-intro-head").textContent = this.t.teaser(
      `${SR_FMT(this.lang, first)}€`,
    );

    // Sub header: "budget overview for a single registration of €TOTAL"
    this.modal.querySelector(".sr-intro-sub").textContent = this.t.overview(
      SR_FMT(this.lang, total),
    );

    // Table rows
    const body = this.modal.querySelector(".sr-schedule-body");
    body.innerHTML = "";
    schedule.forEach((amount, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${idx + 1}</td><td>${SR_FMT(this.lang, amount)} €</td>`;
      body.appendChild(tr);
    });

    // Legal (dynamic, or legacy JSON if allowed and present)
    const legal = this.modal.querySelector(".sr-legal-dyn");
    const legalHtml = this.buildLegalFromTab(tab);
    legal.innerHTML = legalHtml ? `<p>${legalHtml}</p>` : "";

    // Keep the existing dd/mm/yyyy stamp for backward compatibility
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    this.modal.querySelector(".sr-date-stamp").textContent =
      `${this.t.dateLabel}: ${dd}/${mm}/${yyyy}`;
  }

  /* ====================================================================== */
  /* =                           Data sources                             = */
  /* ====================================================================== */

  /**
   * Shopify cart total:
   * - GET "/cart.js" -> { total_price: <cents>, ... }
   * - Convert cents to euros
   */
  async getCartTotal() {
    // Standalone mode: total passed directly via data-total attribute
    const dataTotal = parseFloat(this.root.dataset.total);
    if (!isNaN(dataTotal) && dataTotal > 0) return dataTotal;

    // Shopify mode: read from /cart.js
    try {
      const r = await fetch("/cart.js", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const cart = await r.json();
      return (cart.total_price || 0) / 100;
    } catch (e) {
      console.error("[Revolving] cart.js error:", e);
      return 0;
    }
  }
}

/* ========================================================================== */
/* =                                  Boot                                  = */
/* ========================================================================== */

/**
 * Deduplicate CSS and JS resources to avoid loading them multiple times
 * when both app embed and app block are active.
 */
function __sr_deduplicateResources() {
  // Remove duplicate stylesheets
  const styles = document.querySelectorAll('link[data-sr-styles]');
  if (styles.length > 1) {
    for (let i = 1; i < styles.length; i++) {
      styles[i].remove();
    }
  }

  // Remove duplicate scripts
  const scripts = document.querySelectorAll('script[data-sr-script]');
  if (scripts.length > 1) {
    for (let i = 1; i < scripts.length; i++) {
      scripts[i].remove();
    }
  }
}

/**
 * Initialize all calculator roots present on the page.
 * We also register a Shopify section:load hook (theme editor etc).
 */
function __sr_boot() {
  __sr_deduplicateResources();
  // Initialize app blocks (inline buttons)
  document
    .querySelectorAll('[id^="santander-revolving-root-"]')
    .forEach((root) => {
      if (!root.__sr_instance) root.__sr_instance = new RevolvingCalc(root);
    });
  
  // Initialize app embed (cart button)
  const cartEmbed = document.getElementById("santander-revolving-cart-embed");
  if (cartEmbed && !cartEmbed.__sr_instance) {
    cartEmbed.__sr_instance = new RevolvingCalc(cartEmbed);
  }
}

if (!window.__SR_RevolvingInit) {
  window.__SR_RevolvingInit = true;
  document.addEventListener("DOMContentLoaded", __sr_boot);
  document.addEventListener("shopify:section:load", (e) => {
    e?.target
      ?.querySelectorAll?.('[id^="santander-revolving-root-"]')
      .forEach((root) => {
        if (!root.__sr_instance) root.__sr_instance = new RevolvingCalc(root);
      });
    
    // Also check for cart embed in section load
    const cartEmbed = e?.target?.querySelector?.("#santander-revolving-cart-embed");
    if (cartEmbed && !cartEmbed.__sr_instance) {
      cartEmbed.__sr_instance = new RevolvingCalc(cartEmbed);
    }
  });
}

import { STRINGS } from "./i18n.ts";
import type { Lang, RateCard, Tier } from "./types.ts";

const LOCALE: Record<Lang, string> = { fr: "fr-BE", nl: "nl-BE", de: "de-DE", en: "en-GB" };

/** "1 234,50 €" — number in the language's format, euro sign after, as in v1. */
export function money(lang: Lang, n: number): string {
  return `${n.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** "1 250 €" / "€1,250" — whole-euro currency for limits. */
export function moneyInt(lang: Lang, n: number): string {
  return new Intl.NumberFormat(LOCALE[lang], {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function percent(lang: Lang, fraction: number): string {
  return new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(fraction * 100);
}

/** dd/mm/yyyy, or dd.mm.yyyy in German. Accepts a Date or an ISO date string
 *  (parsed as a calendar date, never shifted by the visitor's timezone). */
export function dateDmy(lang: Lang, d: Date | string): string {
  let dd: string, mm: string, yyyy: string;
  if (typeof d === "string") [yyyy, mm, dd] = d.slice(0, 10).split("-");
  else {
    dd = String(d.getDate()).padStart(2, "0");
    mm = String(d.getMonth() + 1).padStart(2, "0");
    yyyy = String(d.getFullYear());
  }
  const sep = STRINGS[lang].dateSep;
  return `${dd}${sep}${mm}${sep}${yyyy}`;
}

export function tierLabel(lang: Lang, tier: Tier): string {
  return tier.limitMin <= 0
    ? `≤ ${moneyInt(lang, tier.limitMax)}`
    : `${moneyInt(lang, tier.limitMin)} - ${moneyInt(lang, tier.limitMax)}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Legal sentence for a tier as safe HTML. The template may come from the
 *  Studio, so it's escaped before [[…]] becomes <strong>. */
export function legalHtml(lang: Lang, card: RateCard, tier: Tier): string {
  const custom = card.content?.[lang];
  const template =
    tier.limitMin <= 0
      ? custom?.legalUpTo || STRINGS[lang].legalUpTo
      : custom?.legalBetween || STRINGS[lang].legalBetween;
  const values: Record<string, string> = {
    min: moneyInt(lang, tier.limitMin),
    max: moneyInt(lang, tier.limitMax),
    taeg: percent(lang, tier.aprRepresentative),
    rate: percent(lang, tier.aprNominal),
    fee: percent(lang, tier.openFeeMonthly),
    date: dateDmy(lang, card.validFrom),
  };
  return escapeHtml(template)
    .replace(/\{(\w+)\}/g, (m, k) => (k in values ? escapeHtml(values[k]) : m))
    .replace(/\[\[(.*?)\]\]/g, "<strong>$1</strong>");
}

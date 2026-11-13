export type Lang = "fr" | "en" | "nl" | "de";

export const LANGS: readonly Lang[] = ["fr", "en", "nl", "de"];

/** One step of Santander's minimum-payment ladder: while the outstanding
 *  balance is within [min, max], the monthly payment is `payment`. */
export interface LadderStep {
  min: number;
  max: number;
  payment: number;
}

/** A credit-limit tier (e.g. "≤ 1 250 €" or "1 251 € - 5 000 €"). Rates are
 *  fractions: 0.1649 means 16.49 %. */
export interface Tier {
  id: string;
  limitMin: number;
  limitMax: number;
  aprRepresentative: number;
  aprNominal: number;
  openFeeMonthly: number;
  /** Always derived from aprRepresentative, never edited by hand. */
  monthlyRate: number;
  paymentStep: number;
  minPayment: number;
  ladder: LadderStep[];
}

/** Text Santander can override per language from the Studio. Any field left
 *  empty falls back to the built-in, legally reviewed default. */
export interface LocalizedContent {
  warning?: string;
  title?: string;
  /** Legal sentence for a tier starting at 0. Placeholders: {max} {taeg} {rate} {fee} {date} */
  legalUpTo?: string;
  /** Legal sentence for a tier with a lower bound. Placeholders: {min} {max} {taeg} {rate} {fee} {date} */
  legalBetween?: string;
}

/** Public contract served by /api/rate-card and consumed by the widget. */
export interface RateCard {
  version: 2;
  id: string;
  /** ISO date (YYYY-MM-DD) shown in the legal text as "Taux valable au …". */
  validFrom: string;
  updatedAt?: string;
  tiers: Tier[];
  content?: Partial<Record<Lang, LocalizedContent>>;
}

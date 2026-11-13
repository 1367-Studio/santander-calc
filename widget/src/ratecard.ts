import { buildSchedule, monthlyRateFromApr } from "./calc.ts";
import { parseLadder, validateLadder } from "./ladder.ts";
import { LANGS, type LadderStep, type LocalizedContent, type RateCard, type Tier } from "./types.ts";

/** An official simulation from Santander's own tool, used as a test case. */
export interface ReferenceExample {
  amount?: number;
  firstPayment?: number;
  months?: number;
  lastPayment?: number;
}

export interface TierDoc {
  code?: string;
  limitMin?: number;
  limitMax?: number;
  aprRepresentative?: number;
  aprNominal?: number;
  openFeeMonthly?: number;
  paymentStep?: number;
  minPayment?: number;
  ladder?: string;
  maxMonths?: number;
  examples?: ReferenceExample[];
}

/** Shape of a `rateCard` document as stored in Sanity (percentages as typed
 *  by editors, ladder as pasted text). */
export interface RateCardDoc {
  _id: string;
  _updatedAt?: string;
  validFrom?: string;
  tiers?: TierDoc[];
  content?: Partial<Record<string, LocalizedContent | undefined>>;
}

const pct = (v: number | undefined) => (typeof v === "number" ? +(v / 100).toFixed(10) : NaN);

/** How far the published TAEG may sit from the one implied by the nominal
 *  rate + card fee. Santander rounds to 2 decimals; every real band so far is
 *  within 0.01 point, a typo (16.94 for 16.49, swapped fields…) is way out. */
export const TAEG_TOLERANCE = 0.0002;

/** TAEG implied by a nominal annual rate plus a monthly card fee on the
 *  outstanding balance: ((1 + nominal)^(1/12) − 1 + fee + 1)^12 − 1. */
export function impliedTaeg(aprNominal: number, openFeeMonthly: number): number {
  const monthly = Math.pow(1 + aprNominal, 1 / 12) - 1 + openFeeMonthly;
  return Math.pow(1 + monthly, 12) - 1;
}

export function tierFromDoc(t: TierDoc, index: number): { tier: Tier; errors: string[] } {
  const { steps, errors: ladderErrors } = parseLadder(t.ladder || "");
  const tier: Tier = {
    id: t.code || String.fromCharCode(65 + index),
    limitMin: Number(t.limitMin ?? 0),
    limitMax: Number(t.limitMax),
    aprRepresentative: pct(t.aprRepresentative),
    aprNominal: pct(t.aprNominal),
    openFeeMonthly: pct(t.openFeeMonthly),
    monthlyRate: monthlyRateFromApr(pct(t.aprRepresentative)),
    paymentStep: Number(t.paymentStep ?? 2.5),
    minPayment: Number(t.minPayment ?? 25),
    ladder: steps,
  };
  const errors = [
    ...ladderErrors.map((e) => `Payment ladder: ${e}`),
    ...validateTier(tier, { maxMonths: t.maxMonths, examples: t.examples }),
  ];
  return { tier, errors };
}

/**
 * Turn a Sanity document into the public RateCard, refusing anything that
 * would produce a wrong or broken schedule. The same function backs the
 * Studio validation, the Studio preview and the public API, so an editor
 * can't publish something the API would then serve.
 */
export function rateCardFromDoc(doc: RateCardDoc): { card: RateCard | null; errors: string[] } {
  const errors: string[] = [];
  if (!doc.validFrom || !/^\d{4}-\d{2}-\d{2}$/.test(doc.validFrom)) errors.push("Valid-from date is missing");

  const tiers = (doc.tiers || []).map((t, i) => {
    const { tier, errors: tierErrors } = tierFromDoc(t, i);
    errors.push(...tierErrors.map((e) => `Tier ${tier.id}: ${e}`));
    return tier;
  });

  if (!tiers.length) errors.push("At least one tier is required");
  const sorted = [...tiers].sort((a, b) => a.limitMin - b.limitMin);
  sorted.forEach((t, i) => {
    const prev = sorted[i - 1];
    if (!prev) return;
    if (t.limitMin <= prev.limitMax) errors.push(`Tiers ${prev.id} and ${t.id} overlap`);
    else if (t.limitMin - prev.limitMax > 1) errors.push(`Gap between tier ${prev.id} (up to ${prev.limitMax}) and tier ${t.id} (from ${t.limitMin})`);
  });
  if (sorted[0] && sorted[0].limitMin > 0) errors.push(`The first tier must start at 0 (starts at ${sorted[0].limitMin})`);
  if (new Set(tiers.map((t) => t.id)).size !== tiers.length) errors.push("Two tiers share the same code");

  const content: RateCard["content"] = {};
  for (const lang of LANGS) {
    const c = doc.content?.[lang];
    if (!c) continue;
    const clean: LocalizedContent = {};
    (["warning", "title", "legalUpTo", "legalBetween"] as const).forEach((k) => {
      const v = c[k]?.trim();
      if (!v) return;
      clean[k] = v;
      const unknown = [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((p) => !["min", "max", "taeg", "rate", "fee", "date"].includes(p));
      if (unknown.length) errors.push(`Text (${lang.toUpperCase()}) ${k}: unknown placeholder {${unknown.join("}, {")}}`);
    });
    for (const k of ["legalUpTo", "legalBetween"] as const) {
      const v = clean[k];
      if (v && !/\{taeg\}/.test(v)) errors.push(`Text (${lang.toUpperCase()}) ${k}: the legal sentence must contain {taeg}`);
    }
    if (Object.keys(clean).length) content[lang] = clean;
  }

  if (errors.length) return { card: null, errors };
  return {
    card: {
      version: 2,
      id: doc._id.replace(/^drafts\./, ""),
      validFrom: doc.validFrom!,
      updatedAt: doc._updatedAt,
      tiers: sorted,
      content,
    },
    errors,
  };
}

/**
 * Every rule a tier must satisfy before it can calculate anything for a
 * customer. Rates are fractions here (0.1649).
 */
export function validateTier(t: Tier, opts: { maxMonths?: number; examples?: ReferenceExample[] } = {}): string[] {
  const errors: string[] = [];
  const pp = (f: number) => `${+(f * 100).toFixed(4)} %`;

  // 1. Rates are present and plausible.
  const rate = (name: string, v: number, max: number) => {
    if (!Number.isFinite(v)) errors.push(`${name} is missing`);
    else if (v <= 0 || v >= max) errors.push(`${name} = ${pp(v)} is outside the plausible range (0 – ${max * 100} %)`);
  };
  rate("TAEG", t.aprRepresentative, 0.5);
  rate("Nominal debit rate", t.aprNominal, 0.5);
  if (!Number.isFinite(t.openFeeMonthly) || t.openFeeMonthly < 0 || t.openFeeMonthly >= 0.05)
    errors.push("Monthly card fee is missing or outside the plausible range (0 – 5 %)");
  if (!Number.isFinite(t.limitMax) || t.limitMax <= t.limitMin) errors.push("Credit limit max must be above min");
  if (!(t.minPayment > 0)) errors.push("Minimum payment must be positive");
  if (errors.length) return errors;

  // 2. The three rates must agree with each other.
  const implied = impliedTaeg(t.aprNominal, t.openFeeMonthly);
  if (Math.abs(implied - t.aprRepresentative) > TAEG_TOLERANCE) {
    errors.push(
      `TAEG ${pp(t.aprRepresentative)} doesn't match the nominal rate ${pp(t.aprNominal)} + card fee ${pp(t.openFeeMonthly)}/month, ` +
        `which give a TAEG of ${pp(implied)}. One of the three values is probably mistyped.`,
    );
  }

  // 3. The ladder must repay: each step covers the interest at its top.
  if (!t.ladder.length) return [...errors, "Payment ladder is empty"];
  const last = t.ladder[t.ladder.length - 1];
  if (last.max < t.limitMax) errors.push(`Payment ladder stops at ${last.max} but the credit limit goes up to ${t.limitMax}`);
  for (const s of t.ladder) {
    const top = Math.min(s.max, t.limitMax);
    if (s.payment <= top * t.monthlyRate) {
      errors.push(`Ladder step ${s.min}–${s.max}: payment ${s.payment} doesn't cover the monthly interest (${(top * t.monthlyRate).toFixed(2)})`);
      return errors;
    }
  }

  // 4. Maximum repayment period: simulate every whole euro in the tier.
  if (opts.maxMonths) {
    let worst = 0;
    let worstAt = 0;
    for (let amount = Math.max(1, Math.ceil(t.limitMin)); amount <= t.limitMax; amount++) {
      const n = buildSchedule(amount, t).payments.length;
      if (n > worst) [worst, worstAt] = [n, amount];
    }
    if (worst > opts.maxMonths)
      errors.push(`An amount of ${worstAt} € would take ${worst} months to repay — above the ${opts.maxMonths}-month maximum for this tier`);
  } else if (buildSchedule(t.limitMax, t).truncated) {
    errors.push("A schedule at the credit limit never ends — check the ladder");
  }

  // 5. Official reference simulations must match to the cent.
  for (const ex of opts.examples || []) {
    if (!(Number(ex.amount) > 0)) continue;
    const amount = Number(ex.amount);
    if (amount > t.limitMax) {
      errors.push(`Reference ${amount} €: above this tier's credit limit (${t.limitMax} €)`);
      continue;
    }
    const s = buildSchedule(amount, t).payments;
    const got = { firstPayment: s[0], months: s.length, lastPayment: s[s.length - 1] };
    const diffs: string[] = [];
    if (ex.firstPayment != null && Math.abs(got.firstPayment - ex.firstPayment) > 0.001) diffs.push(`first payment ${got.firstPayment} instead of ${ex.firstPayment}`);
    if (ex.months != null && got.months !== ex.months) diffs.push(`${got.months} months instead of ${ex.months}`);
    if (ex.lastPayment != null && Math.abs(got.lastPayment - ex.lastPayment) > 0.001) diffs.push(`last payment ${got.lastPayment} instead of ${ex.lastPayment}`);
    if (diffs.length) errors.push(`Reference ${amount} €: the calculator gives ${diffs.join(", ")}. Check the rates and the ladder against Santander's table.`);
  }
  return errors;
}

/** Shape of the legacy revolving_bands_*.json files. */
export interface LegacyBand {
  id?: string;
  range: { min: number; max: number };
  apr_nominal: number;
  apr_representative: number;
  open_fee_monthly: number;
  monthly_rate?: number;
  payment_step?: number;
  min_payment?: number;
  valid_date?: string;
  legal_lines?: string[];
  sub_ranges: Array<{ min: number; max: number; first_payment: number }>;
}

export function tierFromLegacy(band: LegacyBand, id: string, limits: { min: number; max: number }): Tier {
  const ladder: LadderStep[] = band.sub_ranges.map((r) => ({ min: r.min, max: r.max, payment: r.first_payment }));
  const tier: Tier = {
    id,
    limitMin: limits.min,
    limitMax: limits.max,
    aprRepresentative: band.apr_representative,
    aprNominal: band.apr_nominal,
    openFeeMonthly: band.open_fee_monthly,
    monthlyRate: monthlyRateFromApr(band.apr_representative),
    paymentStep: band.payment_step ?? 2.5,
    minPayment: band.min_payment ?? 25,
    ladder,
  };
  const ladderErrors = validateLadder(ladder);
  if (ladderErrors.length) throw new Error(`Legacy band ${id}: ${ladderErrors.join("; ")}`);
  return tier;
}

/** Rate validity date from a legacy band ("… Taux valable à 27/05/2025."). */
export function legacyValidFrom(band: LegacyBand): string | undefined {
  if (band.valid_date) return band.valid_date;
  const m = band.legal_lines?.join(" ").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

/** Light runtime guard for data coming over the network into the widget. */
export function isRateCard(x: unknown): x is RateCard {
  const c = x as RateCard;
  return !!c && c.version === 2 && typeof c.validFrom === "string" && Array.isArray(c.tiers) && c.tiers.length > 0;
}

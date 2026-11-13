import type { RateCard, Tier } from "./types.ts";

/** EU APRC definition for monthly-pay credit, inverted:
 *  TAEG = (1 + monthly)^12 - 1  =>  monthly = (1 + TAEG)^(1/12) - 1
 *  Verified bit-for-bit against every revolving_bands_*.json in this repo. */
export function monthlyRateFromApr(aprRepresentative: number): number {
  return Math.pow(1 + aprRepresentative, 1 / 12) - 1;
}

/** Safety net against a misconfigured ladder whose payment never covers the
 *  interest: no real schedule for ≤ 5 000 € comes anywhere near this. */
export const MAX_MONTHS = 600;

export interface Schedule {
  payments: number[];
  /** True when MAX_MONTHS was hit — the ladder/rate combination is broken. */
  truncated: boolean;
}

/**
 * Month-by-month repayment schedule. Each month interest is added first, then
 * the ladder step matching the balance decides the payment.
 *
 * The bound comparisons deliberately reproduce the v1 widget exactly
 * (integer bounds compare against the rounded balance, decimal bounds against
 * the raw balance) — Santander signed off on that output, and
 * test/parity.test.ts locks it in.
 */
export function buildSchedule(total: number, tier: Tier): Schedule {
  const { ladder, monthlyRate: rate, minPayment } = tier;
  const payments: number[] = [];
  let balance = total;

  while (balance > 0.009) {
    if (payments.length >= MAX_MONTHS) return { payments, truncated: true };
    const b = balance;
    let step = ladder.find((r) => {
      const minOk = r.min % 1 !== 0 ? b >= r.min : Math.round(b) >= r.min;
      const maxOk = r.max % 1 !== 0 ? b <= r.max : Math.round(b) <= r.max;
      return minOk && maxOk;
    });
    if (!step) {
      step = [...ladder].reverse().find((r) => (r.max % 1 !== 0 ? b > r.max : Math.round(b) > r.max));
    }
    const payment = step ? step.payment : minPayment;
    balance = +(balance * (1 + rate)).toFixed(10);
    const p = +Math.min(payment, balance).toFixed(2);
    payments.push(p);
    balance = +(balance - p).toFixed(10);
  }
  return { payments, truncated: false };
}

/** The smallest tier whose credit limit covers the amount, or null when the
 *  amount is above every limit. */
export function tierForAmount(card: RateCard, amount: number): Tier | null {
  return sortedTiers(card).find((t) => amount <= t.limitMax) ?? null;
}

export function sortedTiers(card: RateCard): Tier[] {
  return [...card.tiers].sort((a, b) => a.limitMin - b.limitMin);
}

export function maxAmount(card: RateCard): number {
  return Math.max(0, ...card.tiers.map((t) => t.limitMax));
}

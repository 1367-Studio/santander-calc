// Locks the v2 engine to the v1 output Santander signed off on. The reference
// below is the sub_ranges loop from santander-revolving.js (renderSchedule),
// copied verbatim, fed with the JSON files exactly as v1 reads them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSchedule, monthlyRateFromApr, tierForAmount } from "../src/calc.ts";
import { tierFromLegacy, type LegacyBand } from "../src/ratecard.ts";
import type { RateCard } from "../src/types.ts";

const load = (f: string): LegacyBand & { monthly_rate: number } =>
  JSON.parse(readFileSync(new URL(`../../${f}`, import.meta.url), "utf8"));

const A = load("revolving_bands_0_1250.json");
const B = load("revolving_bands_1251_5000.json");

function v1Schedule(total: number, tab: any): number[] {
  const schedule: number[] = [];
  const rate = tab.monthly_rate || 0.0128;
  const minPay = tab.min_payment || 25;
  let balance = total;
  while (balance > 0.009) {
    let sr = tab.sub_ranges.find((r: any) => {
      const minCmp = r.min % 1 !== 0 ? balance >= r.min : Math.round(balance) >= r.min;
      const maxCmp = r.max % 1 !== 0 ? balance <= r.max : Math.round(balance) <= r.max;
      return minCmp && maxCmp;
    });
    if (!sr) {
      sr = [...tab.sub_ranges].reverse().find((r: any) => {
        return r.max % 1 !== 0 ? balance > r.max : Math.round(balance) > r.max;
      });
    }
    const payment = sr ? sr.first_payment : minPay;
    balance = +(balance * (1 + rate)).toFixed(10);
    const p = +Math.min(payment, balance).toFixed(2);
    schedule.push(p);
    balance = +(balance - p).toFixed(10);
  }
  return schedule;
}

// v1 picks tab A for total <= 1250, otherwise B (thresholds [1250, 5000]).
const v1Tab = (total: number) => (total <= 1250 ? A : B);

const card: RateCard = {
  version: 2,
  id: "test",
  validFrom: "2025-05-27",
  tiers: [tierFromLegacy(A, "A", { min: 0, max: 1250 }), tierFromLegacy(B, "B", { min: 1251, max: 5000 })],
};

test("monthly_rate is exactly derived from the TAEG", () => {
  for (const f of ["revolving_bands_0_1250.json", "revolving_bands_1251_5000.json", "revolving_bands_0_2500.json", "revolving_bands_0_5001.json"]) {
    const band = load(f);
    assert.equal(monthlyRateFromApr(band.apr_representative), band.monthly_rate, f);
  }
});

test("schedules match v1 for every amount from 1 € to 5 000 € (whole euros)", () => {
  for (let total = 1; total <= 5000; total++) {
    const tier = tierForAmount(card, total)!;
    assert.deepEqual(buildSchedule(total, tier).payments, v1Schedule(total, v1Tab(total)), `total=${total}`);
  }
});

test("schedules match v1 on cent amounts and around every ladder boundary", () => {
  const amounts = new Set<number>();
  for (let i = 0; i < 4000; i++) amounts.add(+(1 + ((i * 1.2499) % 4999)).toFixed(2));
  for (const band of [A, B]) {
    for (const r of band.sub_ranges) {
      for (const d of [-0.51, -0.5, -0.49, -0.01, 0, 0.01, 0.49, 0.5, 0.51]) {
        for (const edge of [r.min, r.max]) {
          const v = +(edge + d).toFixed(2);
          if (v > 0 && v <= 5000) amounts.add(v);
        }
      }
    }
  }
  amounts.add(1250.5);
  for (const total of amounts) {
    const tier = tierForAmount(card, total)!;
    assert.deepEqual(buildSchedule(total, tier).payments, v1Schedule(total, v1Tab(total)), `total=${total}`);
  }
});

test("a manually chosen higher credit limit uses that tier's rate and ladder", () => {
  assert.deepEqual(buildSchedule(800, card.tiers[1]).payments, v1Schedule(800, B));
});

test("amounts above the highest limit get no tier (v1 silently priced them)", () => {
  assert.equal(tierForAmount(card, 5000.01), null);
});

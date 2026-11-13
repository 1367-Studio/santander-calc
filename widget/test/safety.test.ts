// "Whoever enters the rates, the calculation must be right": every way an
// editor can get a rate card wrong must be refused before it reaches a customer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rateCardDocFromLegacy } from "../src/legacy-doc.ts";
import { impliedTaeg, rateCardFromDoc, type RateCardDoc, type TierDoc } from "../src/ratecard.ts";
import { buildSchedule, tierForAmount } from "../src/calc.ts";
import { parseLadder, serializeLadder } from "../src/ladder.ts";

const load = (f: string) => JSON.parse(readFileSync(new URL(`../../${f}`, import.meta.url), "utf8"));
const A = load("revolving_bands_0_1250.json");
const B = load("revolving_bands_1251_5000.json");
const base = () => rateCardDocFromLegacy(A, B);

/** Copy of the current card with one field of one tier changed. */
function withTier(i: number, patch: Partial<TierDoc>): RateCardDoc {
  const doc = base();
  doc.tiers![i] = { ...doc.tiers![i], ...patch };
  return doc;
}
const errorsOf = (doc: RateCardDoc) => rateCardFromDoc(doc).errors.join("\n");

test("today's rates pass every check and keep v1's exact numbers", () => {
  const { card, errors } = rateCardFromDoc(base());
  assert.deepEqual(errors, []);
  assert.equal(card!.validFrom, "2025-05-27");
  assert.equal(card!.tiers[0].monthlyRate, A.monthly_rate);
  assert.equal(card!.tiers[1].monthlyRate, B.monthly_rate);
  assert.deepEqual(buildSchedule(1000, tierForAmount(card!, 1000)!).payments.slice(0, 3), [57.5, 55, 52.5]);
});

test("TAEG is checked against nominal rate + card fee on every real band", () => {
  for (const f of ["revolving_bands_0_1250.json", "revolving_bands_0_2500.json", "revolving_bands_0_5001.json", "revolving_bands_1251_5000.json"]) {
    const band = load(f);
    assert.ok(Math.abs(impliedTaeg(band.apr_nominal, band.open_fee_monthly) - band.apr_representative) < 0.0002, f);
  }
});

test("a mistyped TAEG is refused", () => {
  assert.match(errorsOf(withTier(0, { aprRepresentative: 16.94 })), /doesn't match the nominal rate/);
  assert.match(errorsOf(withTier(0, { aprRepresentative: 1649 })), /plausible range/);
});

test("a mistyped nominal rate or card fee is refused", () => {
  assert.match(errorsOf(withTier(0, { aprNominal: 15.21 })), /doesn't match/);
  assert.match(errorsOf(withTier(0, { openFeeMonthly: 1 })), /doesn't match/);
});

test("swapping TAEG and nominal rate is refused", () => {
  assert.match(errorsOf(withTier(0, { aprRepresentative: 15.12, aprNominal: 16.49 })), /doesn't match/);
});

test("a new, internally consistent rate with an outdated ladder is caught by the reference simulations", () => {
  // Santander raises the nominal rate and enters a matching TAEG, but nobody updates the ladder or the examples.
  const nominal = 16.2;
  const taeg = +(impliedTaeg(nominal / 100, 0.001) * 100).toFixed(2);
  const errs = errorsOf(withTier(0, { aprNominal: nominal, aprRepresentative: taeg }));
  assert.match(errs, /Reference \d+ €: the calculator gives/);
});

test("a ladder that breaks the maximum repayment period is refused", () => {
  const steps = parseLadder(base().tiers![0].ladder!).steps.map((s) => ({ ...s, payment: Math.max(25, s.payment - 10) }));
  assert.match(errorsOf(withTier(0, { ladder: serializeLadder(steps), examples: [] })), /above the 43-month maximum/);
});

test("a ladder that never repays, has gaps, or stops short is refused", () => {
  assert.match(errorsOf(withTier(0, { ladder: "0\t1250\t5", examples: [], maxMonths: undefined })), /doesn't cover the monthly interest/);
  assert.match(errorsOf(withTier(0, { ladder: "0\t400\t25\n500\t1250\t60" })), /gap/);
  assert.match(errorsOf(withTier(0, { ladder: "0\t441,7\t25\n441,71\t900\t60" })), /stops at 900/);
});

test("tiers that overlap, leave a gap or don't start at 0 are refused", () => {
  assert.match(errorsOf(withTier(1, { limitMin: 1200 })), /overlap/);
  assert.match(errorsOf(withTier(1, { limitMin: 1400, examples: [] })), /Gap between tier A/);
  assert.match(errorsOf(withTier(0, { limitMin: 100 })), /must start at 0/);
});

test("legal text overrides must keep the TAEG and only use known placeholders", () => {
  const doc = base();
  doc.content = { fr: { legalUpTo: "Crédit jusqu'à {max} au taux de {tauxx}" } };
  const errs = errorsOf(doc);
  assert.match(errs, /unknown placeholder \{tauxx\}/);
  assert.match(errs, /must contain \{taeg\}/);
});

test("a missing validity date is refused (v1 printed today's date instead)", () => {
  assert.match(errorsOf({ ...base(), validFrom: undefined }), /Valid-from date is missing/);
});

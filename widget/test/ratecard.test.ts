import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLadder } from "../src/ladder.ts";
import { rateCardFromDoc, type RateCardDoc } from "../src/ratecard.ts";
import { buildSchedule } from "../src/calc.ts";

const ladderA = "0\t441,7\t25\n441,71\t485,8\t27,5\n485,81\t1250\t30";

const doc = (over: Partial<NonNullable<RateCardDoc["tiers"]>[number]> = {}): RateCardDoc => ({
  _id: "drafts.rateCard-2025",
  validFrom: "2025-05-27",
  tiers: [
    { code: "A", limitMin: 0, limitMax: 1250, aprRepresentative: 16.49, aprNominal: 15.12, openFeeMonthly: 0.1, ladder: ladderA, ...over },
  ],
});

test("parses a ladder pasted from Excel (tabs, decimal commas)", () => {
  const { steps, errors } = parseLadder(ladderA);
  assert.deepEqual(errors, []);
  assert.deepEqual(steps[1], { min: 441.71, max: 485.8, payment: 27.5 });
});

test("parses semicolon CSV and thousands separators", () => {
  const { steps, errors } = parseLadder("0;1.000,00;25\n1.000,01;2.000;50");
  assert.deepEqual(errors, []);
  assert.deepEqual(steps[1], { min: 1000.01, max: 2000, payment: 50 });
});

test("flags gaps, overlaps and malformed lines with line numbers", () => {
  assert.match(parseLadder("0\t100\t25\n150\t200\t30").errors.join(), /gap/);
  assert.match(parseLadder("0\t100\t25\n90\t200\t30").errors.join(), /overlap/);
  assert.match(parseLadder("0\t100").errors.join(), /Line 1/);
});

test("converts a Sanity document: percentages to fractions, strips drafts prefix", () => {
  const { card, errors } = rateCardFromDoc(doc());
  assert.deepEqual(errors, []);
  assert.equal(card!.id, "rateCard-2025");
  assert.equal(card!.tiers[0].aprRepresentative, 0.1649);
  assert.equal(card!.tiers[0].openFeeMonthly, 0.001);
  assert.equal(buildSchedule(100, card!.tiers[0]).payments.length, 5);
});

test("rejects swapped rates, typos and a ladder that never repays", () => {
  assert.match(rateCardFromDoc(doc({ aprNominal: 18 })).errors.join(), /doesn't match the nominal rate/);
  assert.match(rateCardFromDoc(doc({ aprRepresentative: 1649 })).errors.join(), /plausible range/);
  assert.match(rateCardFromDoc(doc({ ladder: "0\t1250\t5" })).errors.join(), /doesn't cover the monthly interest/);
  assert.match(rateCardFromDoc({ ...doc(), validFrom: undefined }).errors.join(), /Valid-from date/);
});

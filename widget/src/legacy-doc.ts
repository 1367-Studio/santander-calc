import { serializeLadder } from "./ladder.ts";
import { legacyValidFrom, type LegacyBand, type RateCardDoc, type TierDoc } from "./ratecard.ts";

/**
 * The rate card the widget shows today, rebuilt from the two JSON files v1
 * actually loads (revolving_bands_0_1250.json for "≤ 1 250 €",
 * revolving_bands_1251_5000.json for "1 251 € - 5 000 €").
 *
 * maxMonths and examples are the values v1 produces today — the output
 * Santander signed off on. Replace the examples with simulations from
 * Santander's own tool as soon as they provide them.
 */
export function rateCardDocFromLegacy(a: LegacyBand, b: LegacyBand): RateCardDoc {
  const tier = (band: LegacyBand, code: string, limitMin: number, limitMax: number, extra: Partial<TierDoc>): TierDoc => ({
    code,
    limitMin,
    limitMax,
    aprRepresentative: +(band.apr_representative * 100).toFixed(4),
    aprNominal: +(band.apr_nominal * 100).toFixed(4),
    openFeeMonthly: +(band.open_fee_monthly * 100).toFixed(4),
    paymentStep: band.payment_step ?? 2.5,
    minPayment: band.min_payment ?? 25,
    ladder: serializeLadder(band.sub_ranges.map((r) => ({ min: r.min, max: r.max, payment: r.first_payment }))),
    ...extra,
  });

  return {
    _id: "rateCard-legacy",
    validFrom: legacyValidFrom(a) ?? legacyValidFrom(b),
    tiers: [
      tier(a, "A", 0, 1250, {
        maxMonths: 43,
        examples: [
          { amount: 100, firstPayment: 25, months: 5, lastPayment: 3.32 },
          { amount: 500, firstPayment: 30, months: 23, lastPayment: 18.11 },
          { amount: 1000, firstPayment: 57.5, months: 38, lastPayment: 20.87 },
          { amount: 1250, firstPayment: 72.5, months: 43, lastPayment: 13.89 },
        ],
      }),
      tier(b, "B", 1251, 5000, {
        maxMonths: 93,
        examples: [
          { amount: 1500, firstPayment: 65, months: 56, lastPayment: 7.61 },
          { amount: 2500, firstPayment: 107.5, months: 71, lastPayment: 23.05 },
          { amount: 5000, firstPayment: 212.5, months: 93, lastPayment: 6.69 },
        ],
      }),
    ],
    content: {},
  };
}

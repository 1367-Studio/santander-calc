// The only formula that matters here: monthly_rate is derived EXACTLY from the
// published TAEG (apr_representative), nothing else. Verified bit-for-bit against
// all 4 existing revolving_bands_*.json files (2026-10-27) — this is just the
// standard EU APRC definition for monthly-pay credit, inverted:
//   TAEG = (1 + monthly_rate)^12 - 1   =>   monthly_rate = (1 + TAEG)^(1/12) - 1
export function monthlyRateFromApr(aprRepresentative) {
  return Math.pow(1 + aprRepresentative, 1 / 12) - 1
}

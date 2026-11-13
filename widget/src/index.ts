// ESM entry for bundlers (React wrapper, Next.js, Studio preview).
// Importing it registers <santander-calc> when running in a browser.
import { define } from "./element.ts";

export { SantanderCalcElement, define, loadRateCard, DEFAULT_API } from "./element.ts";
export { buildSchedule, monthlyRateFromApr, tierForAmount, maxAmount } from "./calc.ts";
export { rateCardFromDoc } from "./ratecard.ts";
export type { RateCard, Tier, LadderStep, Lang, LocalizedContent } from "./types.ts";

define();

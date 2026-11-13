import "server-only";
import { rateCardFromDoc, type LegacyBand, type RateCardDoc } from "../../widget/src/ratecard.ts";
import { rateCardDocFromLegacy } from "../../widget/src/legacy-doc.ts";
import type { RateCard } from "../../widget/src/types.ts";
import bandA from "../../revolving_bands_0_1250.json";
import bandB from "../../revolving_bands_1251_5000.json";

export const RATE_CARD_TAG = "rate-card";

const projectId = process.env.SANITY_PROJECT_ID || "0bw3bd6q";
const dataset = process.env.SANITY_DATASET || "production";
const token = process.env.SANITY_READ_TOKEN;

const PROJECTION = `{_id, _updatedAt, validFrom, tiers[]{code, limitMin, limitMax, aprRepresentative, aprNominal, openFeeMonthly, paymentStep, minPayment, ladder, maxMonths, examples[]{amount, firstPayment, months, lastPayment}}, content}`;

export type RateCardResult =
  | { status: "ok"; card: RateCard; source: "sanity" | "repo-fallback"; skipped: Array<{ id: string; errors: string[] }> }
  | { status: "error"; message: string };

/** Today's date in Brussels — rate cards switch over at local midnight. */
export function todayInBrussels(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(now);
}

async function groq<T>(query: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`https://${projectId}.api.sanity.io/v2025-02-19/data/query/${dataset}`);
  url.searchParams.set("query", query);
  url.searchParams.set("perspective", "published");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(`$${k}`, JSON.stringify(v));
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    // Cached until Sanity's publish webhook calls revalidateTag (see
    // /api/revalidate). The date is part of the URL, so a new day is a new
    // cache entry and future-dated rate cards go live at midnight on their own.
    cache: "force-cache",
    next: { tags: [RATE_CARD_TAG], revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Sanity HTTP ${res.status}`);
  return (await res.json()).result as T;
}

/**
 * The rate card in force on `date`: the most recent published card whose
 * validFrom has arrived and that passes every check in rateCardFromDoc.
 * A published card that fails them (it can't, through the Studio — this is
 * defence in depth) is skipped and reported, never served.
 */
export async function getRateCard(date = todayInBrussels()): Promise<RateCardResult> {
  let docs: RateCardDoc[];
  let total: number;
  try {
    [docs, total] = await Promise.all([
      groq<RateCardDoc[]>(`*[_type == "rateCard" && validFrom <= $date] | order(validFrom desc, _updatedAt desc)[0...10]${PROJECTION}`, { date }),
      groq<number>(`count(*[_type == "rateCard"])`, { date }),
    ]);
  } catch (err) {
    console.error("[rate-card] Sanity unreachable:", err);
    return { status: "error", message: "Rate source unreachable" };
  }

  const skipped: Array<{ id: string; errors: string[] }> = [];
  for (const doc of docs) {
    const { card, errors } = rateCardFromDoc(doc);
    if (card) return { status: "ok", card, source: "sanity", skipped };
    skipped.push({ id: doc._id, errors });
    console.error(`[rate-card] skipping invalid rate card ${doc._id}:`, errors);
  }

  // Before the Studio is seeded, keep serving exactly what v1 serves today.
  if (total === 0) {
    const { card } = rateCardFromDoc(rateCardDocFromLegacy(bandA as LegacyBand, bandB as LegacyBand));
    if (card) return { status: "ok", card, source: "repo-fallback", skipped };
  }
  return { status: "error", message: total ? `No valid rate card in force on ${date}` : "No rate card configured" };
}

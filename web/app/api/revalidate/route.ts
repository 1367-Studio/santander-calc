import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { RATE_CARD_TAG } from "@/lib/rate-card";

/**
 * Called by a Sanity webhook whenever a rate card is published, unpublished
 * or deleted. Configure it in sanity.io/manage → API → Webhooks with
 *   URL:     https://<this app>/api/revalidate
 *   Filter:  _type == "rateCard"
 *   Header:  Authorization: Bearer <SANITY_REVALIDATE_SECRET>
 */
export async function POST(request: Request) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(given, secret)) {
    console.warn("[revalidate] rejected request with a missing or wrong secret");
    return Response.json({ revalidated: false, error: "Unauthorized" }, { status: 401 });
  }
  // expire: 0 → the very next request gets the new rates, never the old ones.
  revalidateTag(RATE_CARD_TAG, { expire: 0 });
  const body = await request.json().catch(() => null);
  console.log(`[revalidate] rate card cache purged (document: ${body?._id ?? "unknown"})`);
  return Response.json({ revalidated: true, at: new Date().toISOString() });
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

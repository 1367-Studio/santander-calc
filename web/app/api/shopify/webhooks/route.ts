import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Shopify's mandatory privacy webhooks (customers/data_request,
 * customers/redact, shop/redact). The app stores no customer or shop data —
 * rates are public and the cart is read in the shopper's browser — so after
 * verifying the signature there is nothing to export or delete.
 */
export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_API_SECRET;
  const body = await request.text();
  const given = request.headers.get("x-shopify-hmac-sha256") ?? "";
  const expected = secret ? createHmac("sha256", secret).update(body, "utf8").digest("base64") : "";
  const valid = !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!valid) {
    console.warn("[shopify-webhook] rejected request with an invalid signature");
    return new Response("Unauthorized", { status: 401 });
  }
  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");
  console.log(`[shopify-webhook] ${topic} for ${shop} — no data stored, nothing to do`);
  return new Response(null, { status: 200 });
}

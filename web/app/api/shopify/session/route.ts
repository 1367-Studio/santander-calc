import { sessionFromRequest } from "@/lib/shopify-session";

/**
 * Called by the embedded admin page (app/shopify). App Bridge attaches a
 * session token to the request; this verifies it and returns the shop, so the
 * page only shows store-specific links to an authenticated merchant.
 */
export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) {
    return Response.json(
      { error: "Invalid or missing session token" },
      { status: 401, headers: { "Cache-Control": "no-store", "X-Shopify-Retry-Invalid-Session-Request": "1" } },
    );
  }
  return Response.json({ shop: session.shop }, { headers: { "Cache-Control": "no-store" } });
}

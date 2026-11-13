import type { NextRequest } from "next/server";
import { getRateCard, todayInBrussels } from "@/lib/rate-card";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/**
 * GET /api/rate-card            → the rate card in force today (Brussels time)
 * GET /api/rate-card?at=2027-01-01 → the one in force on that date (preview a scheduled change)
 */
export async function GET(request: NextRequest) {
  const at = request.nextUrl.searchParams.get("at");
  if (at && !/^\d{4}-\d{2}-\d{2}$/.test(at)) {
    return Response.json({ error: "`at` must be YYYY-MM-DD" }, { status: 400, headers: CORS });
  }

  const result = await getRateCard(at || todayInBrussels());
  if (result.status === "error") {
    return Response.json({ error: result.message }, { status: 503, headers: { ...CORS, "Cache-Control": "no-store" } });
  }
  return Response.json(result.card, {
    headers: {
      ...CORS,
      "X-Rate-Card-Source": result.source,
      // Publishing in the Studio purges the server cache instantly; browsers
      // and the CDN may hold a copy for at most a minute on top of that.
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** The app's client ID (public). Must match `client_id` in shopify/shopify.app.toml. */
export const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "4633f83c88257455f6bc563f997fb4bc";

export interface ShopifySession {
  /** e.g. "my-store.myshopify.com" */
  shop: string;
  /** Shopify user ID of the staff member using the app */
  userId?: string;
}

const b64urlToBuffer = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

/**
 * Verifies an App Bridge session token (an HS256 JWT signed with the app
 * secret) and returns the shop it was issued for. Returns null when the token
 * is missing, malformed, expired, for another app, or badly signed.
 * https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens
 */
export function verifySessionToken(token: string | null | undefined, now = Date.now()): ShopifySession | null {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  let head: { alg?: string };
  let claims: { iss?: string; dest?: string; aud?: string; sub?: string; exp?: number; nbf?: number };
  try {
    head = JSON.parse(b64urlToBuffer(header).toString("utf8"));
    claims = JSON.parse(b64urlToBuffer(payload).toString("utf8"));
  } catch {
    return null;
  }
  if (head.alg !== "HS256") return null;

  const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest();
  const given = b64urlToBuffer(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  const seconds = Math.floor(now / 1000);
  const leeway = 10; // clock skew between Shopify and Vercel
  if (typeof claims.exp !== "number" || claims.exp + leeway < seconds) return null;
  if (typeof claims.nbf === "number" && claims.nbf - leeway > seconds) return null;
  if (claims.aud !== SHOPIFY_API_KEY) return null;

  const dest = claims.dest ? new URL(claims.dest).hostname : "";
  const iss = claims.iss ? new URL(claims.iss).hostname : "";
  if (!dest.endsWith(".myshopify.com") || iss !== dest) return null;

  return { shop: dest, userId: claims.sub };
}

/** Reads the `Authorization: Bearer <session token>` header App Bridge adds to fetch calls. */
export function sessionFromRequest(request: Request): ShopifySession | null {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  return verifySessionToken(token);
}

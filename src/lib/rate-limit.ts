import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// In-memory store — best-effort in serverless (resets per cold start).
// For production durability, replace with Upstash Redis or Vercel KV.
const store = new Map<string, RateLimitEntry>();

function getStore(): Map<string, RateLimitEntry> {
  return store;
}

function getRateLimitKey(identifier: string, route: string): string {
  return `${route}:${identifier}`;
}

function checkLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const map = getStore();
  const entry = map.get(key);

  if (!entry || now > entry.resetTime) {
    map.delete(key);
    map.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime };
}

function buildRateLimitResponse(result: { resetTime: number }, config: RateLimitConfig): NextResponse {
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
  return NextResponse.json(
    { error: "Rate limit exceeded. Try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(config.maxRequests),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
      },
    }
  );
}

export function rateLimitByUser(request: NextRequest, uid: string, config: RateLimitConfig): { allowed: boolean; response?: NextResponse } {
  const key = getRateLimitKey(uid, request.nextUrl.pathname);
  const result = checkLimit(key, config);

  if (!result.allowed) {
    return { allowed: false, response: buildRateLimitResponse(result, config) };
  }

  return { allowed: true };
}

export function rateLimitGlobal(request: NextRequest, config: RateLimitConfig): { allowed: boolean; response?: NextResponse } {
  const key = getRateLimitKey("global", request.nextUrl.pathname);
  const result = checkLimit(key, config);

  if (!result.allowed) {
    return { allowed: false, response: buildRateLimitResponse(result, config) };
  }

  return { allowed: true };
}

export const LIMITS = {
  DEFAULT: { windowMs: 60_000, maxRequests: 60 },
  AI_CHAT: { windowMs: 60_000, maxRequests: 30 },
  PLATFORM_SEARCH: { windowMs: 60_000, maxRequests: 10 },
  PRODUCT_ENRICH: { windowMs: 60_000, maxRequests: 20 },
  STORE_PUSH: { windowMs: 60_000, maxRequests: 15 },
  FULFILLMENT: { windowMs: 60_000, maxRequests: 10 },
  AUTH: { windowMs: 900_000, maxRequests: 10 },
} as const;

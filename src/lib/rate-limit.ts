import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type UserTier = "free" | "pro" | "enterprise";

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

let redis: Redis | null = null;
// Upstash Ratelimit instances are built per (maxRequests, windowSeconds) pair
// so each tier/route limit actually applies when Redis is configured. A single
// shared instance would silently enforce only its own hardcoded limiter.
const ratelimitCache = new Map<string, Ratelimit>();
let warnedNoRedis = false;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function getRatelimit(config: RateLimitConfig): Ratelimit | null {
  const r = getRedis();
  if (!r) {
    if (process.env.NODE_ENV === "production" && !warnedNoRedis) {
      warnedNoRedis = true;
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set. " +
        "Rate limiting is using an in-memory fallback that does NOT persist across serverless cold starts. " +
        "Configure Upstash Redis for reliable production rate limiting."
      );
    }
    return null;
  }
  const windowSeconds = Math.max(1, Math.ceil(config.windowMs / 1000));
  const cacheKey = `${config.maxRequests}:${windowSeconds}`;
  let rl = ratelimitCache.get(cacheKey);
  if (!rl) {
    rl = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${windowSeconds} s`),
      analytics: true,
      prefix: "dropship:rl",
    });
    ratelimitCache.set(cacheKey, rl);
  }
  return rl;
}

const store = new Map<string, RateLimitEntry>();

function getStore(): Map<string, RateLimitEntry> {
  return store;
}

// Periodically drop expired entries so the in-memory fallback (used when
// Upstash Redis is not configured) cannot grow without bound in
// long-lived server processes.
const SWEEP_INTERVAL_MS = 60_000;
const SWEEP_MAX_SIZE = 10_000;
let lastSweep = 0;

function sweepExpired(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS && store.size < SWEEP_MAX_SIZE) return;
  lastSweep = now;
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key);
  }
}

function getRateLimitKey(identifier: string, route: string): string {
  return `${route}:${identifier}`;
}

function checkLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  sweepExpired(now);
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

function buildRateLimitResponse(result: { remaining?: number; resetTime?: number; retryAfter?: number }, config: RateLimitConfig): NextResponse {
  const retryAfter = result.retryAfter ?? (result.resetTime ? Math.ceil((result.resetTime - Date.now()) / 1000) : 60);
  return NextResponse.json(
    { error: "Rate limit exceeded. Try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(config.maxRequests),
        "X-RateLimit-Remaining": String(result.remaining ?? 0),
        "X-RateLimit-Reset": String(Math.ceil((result.resetTime ?? Date.now() + config.windowMs) / 1000)),
      },
    }
  );
}

export function getTierLimits(tier: UserTier): Record<string, RateLimitConfig> {
  switch (tier) {
    case "enterprise":
      return {
        DEFAULT: { windowMs: 60_000, maxRequests: 300 },
        AI_CHAT: { windowMs: 60_000, maxRequests: 150 },
        PLATFORM_SEARCH: { windowMs: 60_000, maxRequests: 50 },
        PRODUCT_ENRICH: { windowMs: 60_000, maxRequests: 100 },
        STORE_PUSH: { windowMs: 60_000, maxRequests: 75 },
        FULFILLMENT: { windowMs: 60_000, maxRequests: 50 },
        RETURNS: { windowMs: 60_000, maxRequests: 150 },
        AUTH: { windowMs: 900_000, maxRequests: 30 },
        WEBHOOK_OUTGOING: { windowMs: 60_000, maxRequests: 200 },
        API_EXTERNAL: { windowMs: 60_000, maxRequests: 100 },
      };
    case "pro":
      return {
        DEFAULT: { windowMs: 60_000, maxRequests: 120 },
        AI_CHAT: { windowMs: 60_000, maxRequests: 60 },
        PLATFORM_SEARCH: { windowMs: 60_000, maxRequests: 25 },
        PRODUCT_ENRICH: { windowMs: 60_000, maxRequests: 50 },
        STORE_PUSH: { windowMs: 60_000, maxRequests: 30 },
        FULFILLMENT: { windowMs: 60_000, maxRequests: 25 },
        RETURNS: { windowMs: 60_000, maxRequests: 60 },
        AUTH: { windowMs: 900_000, maxRequests: 20 },
        WEBHOOK_OUTGOING: { windowMs: 60_000, maxRequests: 100 },
        API_EXTERNAL: { windowMs: 60_000, maxRequests: 50 },
      };
    case "free":
    default:
      return LIMITS;
  }
}

async function checkRedisLimit(key: string, config: RateLimitConfig): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const rl = getRatelimit(config);
  if (!rl) return checkLimit(key, config);

  try {
    const result = await rl.limit(key);
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetTime: result.reset,
    };
  } catch {
    return checkLimit(key, config);
  }
}

export async function rateLimitByUser(
  request: NextRequest,
  uid: string,
  config: RateLimitConfig,
  tier: UserTier = "free"
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const tierConfig = getTierLimits(tier);
  const effectiveConfig = { ...tierConfig.DEFAULT, ...config };
  const key = getRateLimitKey(uid, request.nextUrl.pathname);
  const result = await checkRedisLimit(key, effectiveConfig);

  if (!result.allowed) {
    return { allowed: false, response: buildRateLimitResponse(result, effectiveConfig) };
  }

  return { allowed: true };
}

export async function rateLimitGlobal(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const key = getRateLimitKey("global", request.nextUrl.pathname);
  const result = await checkRedisLimit(key, config);

  if (!result.allowed) {
    return { allowed: false, response: buildRateLimitResponse(result, config) };
  }

  return { allowed: true };
}

export async function rateLimitByKey(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  return checkRedisLimit(key, config);
}

export async function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): Promise<{ remaining: number; limit: number; resetTime: number }> {
  const rl = getRatelimit(config);
  if (rl) {
    try {
      // getRemaining() is read-only — unlike limit() it does NOT consume quota.
      const status = await rl.getRemaining(key);
      return {
        remaining: status.remaining,
        limit: config.maxRequests,
        resetTime: status.reset || Date.now() + config.windowMs,
      };
    } catch {
      // Fall through to the in-memory store below.
    }
  }

  const map = getStore();
  const entry = map.get(key);
  if (!entry || Date.now() > entry.resetTime) {
    return { remaining: config.maxRequests, limit: config.maxRequests, resetTime: Date.now() + config.windowMs };
  }
  return { remaining: config.maxRequests - entry.count, limit: config.maxRequests, resetTime: entry.resetTime };
}

export const LIMITS = {
  DEFAULT: { windowMs: 60_000, maxRequests: 60 },
  AI_CHAT: { windowMs: 60_000, maxRequests: 30 },
  PLATFORM_SEARCH: { windowMs: 60_000, maxRequests: 10 },
  PRODUCT_ENRICH: { windowMs: 60_000, maxRequests: 20 },
  STORE_PUSH: { windowMs: 60_000, maxRequests: 15 },
  FULFILLMENT: { windowMs: 60_000, maxRequests: 10 },
  RETURNS: { windowMs: 60_000, maxRequests: 30 },
  DASHBOARDS: { windowMs: 60_000, maxRequests: 20 },
  NOTIFICATIONS: { windowMs: 60_000, maxRequests: 40 },
  BULK_OPS: { windowMs: 60_000, maxRequests: 10 },
  ORDER_NOTES: { windowMs: 60_000, maxRequests: 50 },
  AUTH: { windowMs: 900_000, maxRequests: 10 },
  WEBHOOK_OUTGOING: { windowMs: 60_000, maxRequests: 50 },
  API_EXTERNAL: { windowMs: 60_000, maxRequests: 30 },
} as const;

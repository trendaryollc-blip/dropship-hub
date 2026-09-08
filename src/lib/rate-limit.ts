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
let ratelimit: Ratelimit | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;
  const r = getRedis();
  if (!r) return null;
  ratelimit = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(60, "60 s"),
    analytics: true,
    prefix: "dropship:rl",
  });
  return ratelimit;
}

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
  const rl = getRatelimit();
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
  const rl = getRatelimit();
  if (!rl) {
    const map = getStore();
    const entry = map.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return { remaining: config.maxRequests, limit: config.maxRequests, resetTime: Date.now() + config.windowMs };
    }
    return { remaining: config.maxRequests - entry.count, limit: config.maxRequests, resetTime: entry.resetTime };
  }

  try {
    const result = await rl.limit(key);
    return { remaining: result.remaining, limit: config.maxRequests, resetTime: result.reset };
  } catch {
    return { remaining: config.maxRequests, limit: config.maxRequests, resetTime: Date.now() + config.windowMs };
  }
}

export const LIMITS = {
  DEFAULT: { windowMs: 60_000, maxRequests: 60 },
  AI_CHAT: { windowMs: 60_000, maxRequests: 30 },
  PLATFORM_SEARCH: { windowMs: 60_000, maxRequests: 10 },
  PRODUCT_ENRICH: { windowMs: 60_000, maxRequests: 20 },
  STORE_PUSH: { windowMs: 60_000, maxRequests: 15 },
  FULFILLMENT: { windowMs: 60_000, maxRequests: 10 },
  RETURNS: { windowMs: 60_000, maxRequests: 30 },
  AUTH: { windowMs: 900_000, maxRequests: 10 },
  WEBHOOK_OUTGOING: { windowMs: 60_000, maxRequests: 50 },
  API_EXTERNAL: { windowMs: 60_000, maxRequests: 30 },
} as const;

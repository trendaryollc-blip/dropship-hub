import { Redis } from "@upstash/redis";

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const CACHE_PREFIX = "trends:";
const DEFAULT_TTL = 3600; // 1 hour

function getCacheKey(namespace: string, ...parts: string[]): string {
  const hash = parts.join(":").toLowerCase().replace(/[^a-z0-9:]/g, "_");
  return `${CACHE_PREFIX}${namespace}:${hash}`;
}

export async function getCached<T>(namespace: string, ...keyParts: string[]): Promise<T | null> {
  if (!redis) return null;
  try {
    const key = getCacheKey(namespace, ...keyParts);
    const data = await redis.get<T>(key);
    return data;
  } catch {
    return null;
  }
}

export async function setCache<T>(
  namespace: string,
  data: T,
  ttl: number = DEFAULT_TTL,
  ...keyParts: string[]
): Promise<void> {
  if (!redis) return;
  try {
    const key = getCacheKey(namespace, ...keyParts);
    await redis.set(key, data, { ex: ttl });
  } catch {
    // Cache write failure is non-critical
  }
}

export async function deleteCached(namespace: string, ...keyParts: string[]): Promise<void> {
  if (!redis) return;
  try {
    const key = getCacheKey(namespace, ...keyParts);
    await redis.del(key);
  } catch {
    // Non-critical
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(`${CACHE_PREFIX}${pattern}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Non-critical
  }
}

export const CACHE_TTL = {
  GOOGLE_TRENDS: 3600,       // 1 hour
  AMAZON_BSR: 21600,         // 6 hours
  AMAZON_PRICE: 86400,       // 24 hours
  SOCIAL_SIGNALS: 14400,     // 4 hours
  AGGREGATED: 1800,          // 30 minutes
  RISING_STARS: 3600,        // 1 hour
  PREDICTIONS: 86400,        // 24 hours
} as const;

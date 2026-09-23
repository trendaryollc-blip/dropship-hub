import { getCached, setCache } from "@/lib/data-sources/cache";

interface MemEntry {
  value: unknown;
  expiresAt: number;
}

// In-process fallback so discovery feeds stay cached even when Upstash Redis
// is not configured (local dev, tests). When Redis IS configured the shared
// cache is the source of truth across serverless instances.
const memCache = new Map<string, MemEntry>();

function memKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

export async function getFeedCache<T>(
  namespace: string,
  key: string,
  _ttlSeconds: number
): Promise<T | null> {
  const cached = await getCached<T>(namespace, key);
  if (cached !== null && cached !== undefined) return cached;

  const mk = memKey(namespace, key);
  const mem = memCache.get(mk);
  if (mem && Date.now() < mem.expiresAt) return mem.value as T;
  memCache.delete(mk);
  return null;
}

export async function setFeedCache<T>(
  namespace: string,
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await setCache<T>(namespace, value, ttlSeconds, key);
  memCache.set(memKey(namespace, key), { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
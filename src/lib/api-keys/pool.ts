/**
 * Env-based API key pool with rotation and cooldown.
 *
 * Supports the free-tier strategy: multiple keys per provider
 * (`SERPAPI_KEYS=key1,key2,key3,key4`). When a key hits its quota it is
 * cooled down (Redis-backed when Upstash is configured, in-memory
 * otherwise) and the next key is tried. When every key is exhausted a
 * typed QuotaExhaustedError is thrown — callers must surface that state,
 * never fabricate fallback data.
 *
 * Complements (does not replace) the Firestore-managed key registry in
 * `platform-config.ts`, which platform search prefers; this pool backs the
 * env-var path and every non-platform-search provider call.
 */
import { Redis } from "@upstash/redis";
import { PublicError } from "@/lib/api-errors";
import { getProviderSetup, type ProviderId, type ProviderSetup } from "./providers";

export type { ProviderId, ProviderSetup } from "./providers";

// ── Errors (PublicError → safe to forward setup hints to clients) ──────────

export class ConfigMissingError extends PublicError {
  readonly provider: ProviderId;
  readonly setup: ProviderSetup;
  constructor(provider: ProviderId) {
    const s = getProviderSetup(provider);
    super(
      `${s.name} is not configured. Get a key at ${s.getKeyUrl}, then set ${s.poolEnvVar} in .env.local (or Settings → API Keys).`
    );
    this.name = "ConfigMissingError";
    this.provider = provider;
    this.setup = s;
  }
}

export class QuotaExhaustedError extends PublicError {
  readonly provider: ProviderId;
  readonly keyCount: number;
  /** Epoch ms when the earliest cooled-down key becomes available again. */
  readonly resetsAt?: number;
  constructor(provider: ProviderId, keyCount: number, resetsAt?: number) {
    const s = getProviderSetup(provider);
    const when = resetsAt ? ` Resets around ${new Date(resetsAt).toISOString()}.` : "";
    super(
      `All ${keyCount} ${s.name} key(s) hit their quota.${when} Add another key to ${s.poolEnvVar} or upgrade the plan.`
    );
    this.name = "QuotaExhaustedError";
    this.provider = provider;
    this.keyCount = keyCount;
    this.resetsAt = resetsAt;
  }
}

// ── Key resolution ──────────────────────────────────────────────────────────

/**
 * Build the key pool for a provider by merging every declared env var.
 * Pool vars are listed first in PROVIDERS, so their order is preserved;
 * duplicates are dropped. Reads `process.env` at call time (serverless-safe).
 */
export function getPoolKeys(provider: ProviderId): string[] {
  const setup = getProviderSetup(provider);
  const seen = new Set<string>();
  for (const envVar of setup.envVars) {
    const raw = process.env[envVar];
    if (!raw) continue;
    for (const part of raw.split(",")) {
      const key = part.trim();
      if (key) seen.add(key);
    }
  }
  return [...seen];
}

/** First ready key without executing a call — for callers that only need a value (config checks, seeds). */
export function getPrimaryKey(provider: ProviderId): string {
  return getPoolKeys(provider)[0] ?? "";
}

// ── Error classification ───────────────────────────────────────────────────

const QUOTA_PATTERN =
  /\b429\b|too many requests|rate.?limit|quota|out of (searches|credits|requests)|credits? (exhausted|exceeded|used up)|exceeded your (current )?(plan|quota|usage)|no searches left|billing|out of stock of searches/i;

const AUTH_PATTERN = /\b401\b|\b403\b|invalid api[_ ]key|unauthorized|forbidden|incorrect api key|invalid key/i;

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function isQuotaError(error: unknown): boolean {
  const anyErr = error as { status?: number; statusCode?: number } | undefined;
  if (anyErr?.status === 429 || anyErr?.statusCode === 429) return true;
  return QUOTA_PATTERN.test(errorText(error));
}

export function isAuthError(error: unknown): boolean {
  const anyErr = error as { status?: number; statusCode?: number } | undefined;
  if (anyErr?.status === 401 || anyErr?.status === 403) return true;
  return AUTH_PATTERN.test(errorText(error));
}

// ── Cooldown store (Redis when available, in-memory otherwise) ─────────────

const COOLDOWN_PREFIX = "dropship:keypool";
/** Default cooldown after a quota hit. Good enough until a provider reports a reset time. */
export const QUOTA_COOLDOWN_MS = 60 * 60 * 1000;
/** Broken/unauthorized keys stay out of rotation much longer. */
export const AUTH_COOLDOWN_MS = 24 * 60 * 60 * 1000;

let redis: Redis | null = null;
let redisResolved = false;

function getRedis(): Redis | null {
  if (redisResolved) return redis;
  redisResolved = true;
  if (process.env.NODE_ENV === "test") {
    redis = null;
    return redis;
  }
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

const memCooldowns = new Map<string, number>();

/** Stable non-reversible-ish reference for a key so raw keys never appear in stores. */
function hashKey(key: string): string {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function cooldownId(provider: ProviderId, key: string): string {
  return `${provider}:${hashKey(key)}`;
}

export async function getCooldownExpiry(provider: ProviderId, key: string): Promise<number> {
  const id = cooldownId(provider, key);
  const r = getRedis();
  if (r) {
    try {
      const value = await r.get<number>(`${COOLDOWN_PREFIX}:${id}`);
      if (typeof value === "number" && value > 0) {
        memCooldowns.set(id, value);
        return value;
      }
      return 0;
    } catch {
      // fall through to memory
    }
  }
  return memCooldowns.get(id) ?? 0;
}

export async function setCooldown(provider: ProviderId, key: string, ttlMs: number): Promise<void> {
  const id = cooldownId(provider, key);
  const expiresAt = Date.now() + ttlMs;
  memCooldowns.set(id, expiresAt);
  const r = getRedis();
  if (r) {
    try {
      await r.set(`${COOLDOWN_PREFIX}:${id}`, expiresAt, { ex: Math.ceil(ttlMs / 1000) });
    } catch {
      // memory copy still applies for this instance
    }
  }
}

/** Test helper: wipe in-memory cooldown state. */
export function __resetPoolStateForTests(): void {
  memCooldowns.clear();
}

// ── withKeyPool ────────────────────────────────────────────────────────────

/**
 * Run `fn` with a pool key, rotating on quota/auth failures.
 *
 * - No keys configured → ConfigMissingError (render setup instructions).
 * - Quota hit → cool key down, try the next; all quota → QuotaExhaustedError.
 * - Auth failure (bad key) → cool key down long, try the next.
 * - Any other error → rethrow immediately (rotating keys won't fix a 500).
 */
export async function withKeyPool<T>(
  provider: ProviderId,
  fn: (key: string) => Promise<T>
): Promise<T> {
  const keys = getPoolKeys(provider);
  if (keys.length === 0) {
    throw new ConfigMissingError(provider);
  }

  const now = Date.now();
  const ready: string[] = [];
  let earliestReset: number | undefined;
  for (const key of keys) {
    const expiry = await getCooldownExpiry(provider, key);
    if (expiry > now) {
      earliestReset =
        earliestReset === undefined ? expiry : Math.min(earliestReset, expiry);
    } else {
      ready.push(key);
    }
  }

  if (ready.length === 0) {
    throw new QuotaExhaustedError(provider, keys.length, earliestReset);
  }

  let quotaFailures = 0;
  let authFailure: unknown;

  for (const key of ready) {
    try {
      return await fn(key);
    } catch (error) {
      if (isQuotaError(error)) {
        quotaFailures++;
        await setCooldown(provider, key, QUOTA_COOLDOWN_MS);
        continue;
      }
      if (isAuthError(error)) {
        authFailure = error;
        await setCooldown(provider, key, AUTH_COOLDOWN_MS);
        continue;
      }
      throw error;
    }
  }

  if (quotaFailures === ready.length) {
    const refreshed = await getCooldownExpiry(provider, ready[0]);
    throw new QuotaExhaustedError(provider, keys.length, refreshed || earliestReset);
  }
  throw authFailure instanceof Error
    ? authFailure
    : new QuotaExhaustedError(provider, keys.length, earliestReset);
}

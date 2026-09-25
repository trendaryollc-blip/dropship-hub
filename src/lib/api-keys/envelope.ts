/**
 * Provenance envelope for data API responses.
 *
 * Every metric endpoint should be able to answer three questions:
 *   status — is this live, missing config, quota-exhausted, an error, or coming soon?
 *   source — which provider / "firestore" / "user" produced the value?
 *   setup  — if unavailable, exactly what must the user obtain and where?
 *
 * Builders guarantee `data: null` for every non-live status so a caller can
 * never mistake an unavailable state for a real value.
 */
import { NextResponse } from "next/server";
import { ConfigMissingError, QuotaExhaustedError, type QuotaExhaustedError as QEE } from "./pool";
import { getProviderSetup, type ProviderId } from "./providers";

export type DataStatus =
  | "live"
  | "config_missing"
  | "quota_exhausted"
  | "provider_error"
  | "coming_soon";

export interface SetupInfo {
  /** What is missing, e.g. "SerpAPI key for Google Trends data". */
  what: string;
  /** Where to obtain it (URL). */
  whereToGet?: string;
  /** Where to set it, e.g. ".env.local → SERPAPI_KEYS or Settings → API Keys". */
  whereToSet: string;
  envVar?: string;
}

export interface EnvelopeMeta {
  status: DataStatus;
  /** Provider id or "firestore" | "user". Omitted when not live. */
  source?: string;
  fetchedAt?: string;
  /** Optional human message (provider_error details, quota hints). */
  message?: string;
  /** Present for config_missing / quota_exhausted. */
  setup?: SetupInfo;
  quota?: { keyCount: number; resetsAt?: string };
  comingSoon?: { whatNeeded: string; howToGet?: string };
}

export interface Envelope<T> {
  data: T | null;
  meta: EnvelopeMeta;
}

// ── Setup helpers ──────────────────────────────────────────────────────────

export function providerSetupInfo(
  provider: ProviderId,
  what?: string
): SetupInfo {
  const s = getProviderSetup(provider);
  return {
    what: what ?? `${s.name} API key`,
    whereToGet: s.getKeyUrl,
    whereToSet: `.env.local → ${s.poolEnvVar} (comma-separated for multiple keys) or Settings → API Keys`,
    envVar: s.poolEnvVar,
  };
}

// ── Builders ───────────────────────────────────────────────────────────────

export function liveEnvelope<T>(data: T, source: string): Envelope<T> {
  return {
    data,
    meta: { status: "live", source, fetchedAt: new Date().toISOString() },
  };
}

export function configMissingEnvelope(
  provider: ProviderId,
  what?: string
): Envelope<null> {
  return {
    data: null,
    meta: { status: "config_missing", setup: providerSetupInfo(provider, what) },
  };
}

export function quotaExhaustedEnvelope(
  provider: ProviderId,
  keyCount: number,
  resetsAt?: string | number,
  what?: string
): Envelope<null> {
  const resetsAtIso =
    resetsAt === undefined
      ? undefined
      : typeof resetsAt === "number"
        ? new Date(resetsAt).toISOString()
        : resetsAt;
  return {
    data: null,
    meta: {
      status: "quota_exhausted",
      setup: providerSetupInfo(provider, what),
      quota: { keyCount, resetsAt: resetsAtIso },
      message: `All ${keyCount} key(s) hit their quota${resetsAtIso ? ` (resets ~${resetsAtIso})` : ""}.`,
    },
  };
}

export function providerErrorEnvelope(
  message: string,
  source?: string
): Envelope<null> {
  return {
    data: null,
    meta: { status: "provider_error", source, message },
  };
}

export function comingSoonEnvelope(
  whatNeeded: string,
  howToGet?: string
): Envelope<null> {
  return {
    data: null,
    meta: { status: "coming_soon", comingSoon: { whatNeeded, howToGet } },
  };
}

/** Map a caught error to a non-live envelope (live only for unexpected → provider_error). */
export function envelopeFromError(
  error: unknown,
  fallbackSource?: string
): Envelope<null> {
  if (error instanceof ConfigMissingError) {
    return configMissingEnvelope(error.provider);
  }
  if (error instanceof QuotaExhaustedError) {
    return quotaExhaustedEnvelope(error.provider, error.keyCount, error.resetsAt);
  }
  const message = error instanceof Error ? error.message : String(error);
  return providerErrorEnvelope(message, fallbackSource);
}

export function isQuotaExhaustedError(error: unknown): error is QEE {
  return error instanceof QuotaExhaustedError;
}

// ── HTTP mapping ───────────────────────────────────────────────────────────

export function envelopeHttpStatus(meta: EnvelopeMeta): number {
  switch (meta.status) {
    case "live":
    case "coming_soon":
      return 200;
    case "config_missing":
      return 503;
    case "quota_exhausted":
      return 429;
    case "provider_error":
      return 502;
  }
}

/**
 * Serialize an envelope as a NextResponse with the provenance status in
 * `X-Data-Status` (easy for clients/tests to assert) and the full meta in body.
 */
export function envelopeToResponse<T>(env: Envelope<T>): NextResponse {
  const headers: Record<string, string> = {
    "X-Data-Status": env.meta.status,
  };
  if (env.meta.status === "quota_exhausted" && env.meta.quota?.resetsAt) {
    const resetSec = Math.ceil(new Date(env.meta.quota.resetsAt).getTime() / 1000);
    headers["X-Quota-Resets"] = String(resetSec);
  }
  return NextResponse.json(
    { data: env.data, meta: env.meta },
    { status: envelopeHttpStatus(env.meta), headers }
  );
}

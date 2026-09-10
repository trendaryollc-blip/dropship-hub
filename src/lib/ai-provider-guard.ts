import { BillingTier } from "@/lib/billing/types";

/**
 * AI providers that are free to use (no paid API key required).
 * Free-tier users are restricted to these providers only.
 */
export const FREE_PROVIDERS = [
  "groq",
  "gemini",
  "huggingface",
] as const;

/**
 * All providers available to Pro/Enterprise users.
 */
export const ALL_PROVIDERS = [
  "groq",
  "gemini",
  "openai",
  "deepseek",
  "mistral",
  "cohere",
  "together",
  "fireworks",
  "openrouter",
  "huggingface",
  "hpc",
] as const;

/**
 * Daily request limits per tier for AI provider calls.
 */
export const AI_DAILY_LIMITS: Record<BillingTier, number> = {
  free: 50,
  pro: 1000,
  enterprise: -1, // unlimited
};

/**
 * Daily request limits per tier for platform searches.
 */
export const SEARCH_DAILY_LIMITS: Record<BillingTier, number> = {
  free: 20,
  pro: 500,
  enterprise: -1, // unlimited
};

/**
 * Check if a user's tier allows them to use a specific AI provider.
 */
export function canUseProvider(tier: BillingTier, providerId: string): boolean {
  if (tier === "pro" || tier === "enterprise") return true;
  return FREE_PROVIDERS.includes(providerId as typeof FREE_PROVIDERS[number]);
}

/**
 * Get the list of providers allowed for a given tier.
 */
export function getAllowedProviders(tier: BillingTier): readonly string[] {
  if (tier === "pro" || tier === "enterprise") return ALL_PROVIDERS;
  return FREE_PROVIDERS;
}

/**
 * Check if a user has exceeded their daily AI call limit.
 * Returns { allowed: boolean, remaining: number, limit: number }
 */
export function checkDailyLimit(
  tier: BillingTier,
  callsToday: number
): { allowed: boolean; remaining: number; limit: number } {
  const limit = AI_DAILY_LIMITS[tier];
  if (limit === -1) return { allowed: true, remaining: -1, limit: -1 };
  const remaining = Math.max(0, limit - callsToday);
  return { allowed: remaining > 0, remaining, limit };
}

/**
 * Check if a user has exceeded their daily search limit.
 */
export function checkSearchLimit(
  tier: BillingTier,
  searchesToday: number
): { allowed: boolean; remaining: number; limit: number } {
  const limit = SEARCH_DAILY_LIMITS[tier];
  if (limit === -1) return { allowed: true, remaining: -1, limit: -1 };
  const remaining = Math.max(0, limit - searchesToday);
  return { allowed: remaining > 0, remaining, limit };
}

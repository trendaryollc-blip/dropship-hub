import { getUserTier } from "@/lib/auth";
import { rateLimitByKey, getTierLimits, LIMITS, type RateLimitConfig } from "@/lib/rate-limit";
import { AI_DAILY_LIMITS, SEARCH_DAILY_LIMITS } from "@/lib/ai-provider-guard";

const DAY_MS = 24 * 60 * 60 * 1000;

export type LimitDecision = { allowed: true } | { allowed: false; error: string };

function formatReset(resetTime: number): string {
  const seconds = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}m`;
  return `${seconds}s`;
}

export async function enforceToolRateLimit(uid: string, toolId: string): Promise<LimitDecision> {
  const tier = await getUserTier(uid);
  const minuteConfig: RateLimitConfig = getTierLimits(tier).AI_TOOL ?? LIMITS.AI_TOOL;
  const minute = await rateLimitByKey(`tool:${uid}:${toolId}`, minuteConfig);
  if (!minute.allowed) {
    return {
      allowed: false,
      error: `Rate limit exceeded for ${toolId}: ${minuteConfig.maxRequests} calls per minute. Try again in ${formatReset(minute.resetTime)}.`,
    };
  }
  const dailyLimit = AI_DAILY_LIMITS[tier];
  if (dailyLimit > 0) {
    const daily = await rateLimitByKey(`ai_daily:${uid}`, { windowMs: DAY_MS, maxRequests: dailyLimit });
    if (!daily.allowed) {
      return {
        allowed: false,
        error: `Daily AI limit reached: ${dailyLimit} calls per day on the ${tier} tier. Try again in ${formatReset(daily.resetTime)}.`,
      };
    }
  }
  return { allowed: true };
}

export async function enforceSearchDailyLimit(uid: string): Promise<LimitDecision> {
  const tier = await getUserTier(uid);
  const dailyLimit = SEARCH_DAILY_LIMITS[tier];
  if (dailyLimit <= 0) return { allowed: true };
  const daily = await rateLimitByKey(`search_daily:${uid}`, { windowMs: DAY_MS, maxRequests: dailyLimit });
  if (!daily.allowed) {
    return {
      allowed: false,
      error: `Daily platform-search limit reached: ${dailyLimit} searches per day on the ${tier} tier. Try again in ${formatReset(daily.resetTime)}.`,
    };
  }
  return { allowed: true };
}

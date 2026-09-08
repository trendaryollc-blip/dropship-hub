import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getUsage } from "@/lib/billing/stripe";
import { getUsageLimit, type UsageMetric } from "@/lib/billing/types";
import { getUserTier } from "@/lib/billing/stripe";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const tier = await getUserTier(uid);
    const metrics: UsageMetric[] = ["ai_calls", "api_calls", "webhook_calls", "products", "store_pushes"];

    const usage: Record<string, { used: number; limit: number; percentage: number }> = {};

    for (const metric of metrics) {
      const used = await getUsage(uid, metric);
      const limit = getUsageLimit(tier, metric);
      usage[metric] = {
        used,
        limit: limit === -1 ? Infinity : limit,
        percentage: limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100)),
      };
    }

    return NextResponse.json({ tier, usage });
  } catch (err) {
    logger.error("Failed to get usage", { uid, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to get usage" }, { status: 500 });
  }
});

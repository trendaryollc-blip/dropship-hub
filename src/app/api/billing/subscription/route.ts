import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getUserSubscription } from "@/lib/billing/stripe";
import { getPlanByTier } from "@/lib/billing/types";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const subscription = await getUserSubscription(uid);
    if (!subscription) {
      return NextResponse.json({
        subscription: null,
        plan: getPlanByTier("free"),
      });
    }

    const plan = getPlanByTier(subscription.tier);

    return NextResponse.json({ subscription, plan });
  } catch (err) {
    logger.error("Failed to get subscription", { uid, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to get subscription" }, { status: 500 });
  }
});

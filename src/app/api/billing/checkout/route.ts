import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/billing/stripe";
import { getPlanByTier, BILLING_PLANS } from "@/lib/billing/types";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { tier, interval = "month" } = body;

    if (!tier || !["pro", "enterprise"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    if (!["month", "year"].includes(interval)) {
      return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
    }

    const plan = getPlanByTier(tier);
    const priceId = interval === "year" ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;

    if (!priceId) {
      return NextResponse.json({ error: "Price not configured for this plan" }, { status: 400 });
    }

    const { getAdminDB } = await import("@/lib/firebase-admin");
    const db = await getAdminDB();
    const userDoc = await db.collection("users").doc(uid).get();
    const email = userDoc.data()?.email;
    if (!email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const session = await createCheckoutSession(uid, email, priceId, tier, interval as "month" | "year");

    return NextResponse.json({ sessionId: session.sessionId, url: session.url });
  } catch (err) {
    logger.error("Failed to create checkout session", { uid, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
});

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  return NextResponse.json({ plans: BILLING_PLANS });
});

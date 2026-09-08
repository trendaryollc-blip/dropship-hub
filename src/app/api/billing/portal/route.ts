import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createCustomerPortalSession } from "@/lib/billing/stripe";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const result = await createCustomerPortalSession(uid);
    return NextResponse.json({ url: result.url });
  } catch (err) {
    logger.error("Failed to create portal session", { uid, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
});

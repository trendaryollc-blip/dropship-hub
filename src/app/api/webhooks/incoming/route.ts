import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getIncomingWebhooks } from "@/lib/webhooks/incoming";
import { logger } from "@/lib/logger";
import type { WebhookStatus } from "@/lib/webhooks/types";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = request.nextUrl;
    const status = (searchParams.get("status") as WebhookStatus) ?? undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await getIncomingWebhooks(uid, { status, limit, offset });

    return NextResponse.json(result);
  } catch (err) {
    logger.error("Failed to get incoming webhooks", { uid, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to get webhooks" }, { status: 500 });
  }
});

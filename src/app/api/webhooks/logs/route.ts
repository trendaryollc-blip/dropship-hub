import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getWebhookLogs, deleteOldWebhookLogs } from "@/lib/webhooks/event-log";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = request.nextUrl;
    const direction = searchParams.get("direction") as "incoming" | "outgoing" | null;
    const webhookId = searchParams.get("webhookId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await getWebhookLogs(uid, {
      direction: direction || undefined,
      webhookId,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (err) {
    logger.error("Failed to get webhook logs", { uid, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to get logs" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = request.nextUrl;
    const olderThanDays = parseInt(searchParams.get("olderThanDays") || "30", 10);

    const deleted = await deleteOldWebhookLogs(uid, olderThanDays);

    return NextResponse.json({ deleted });
  } catch (err) {
    logger.error("Failed to delete old webhook logs", { uid, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete logs" }, { status: 500 });
  }
});

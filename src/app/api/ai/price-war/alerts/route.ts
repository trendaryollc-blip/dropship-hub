import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getPriceAlerts, markAlertsRead, getUnreadAlertCount } from "@/lib/data/price-war";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const countOnly = searchParams.get("count") === "true";

    if (countOnly) {
      const count = await getUnreadAlertCount(uid);
      return NextResponse.json({ count });
    }

    const alerts = await getPriceAlerts(uid, unreadOnly);
    return NextResponse.json({ alerts });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch alerts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { alertIds, markAll } = body as { alertIds?: string[]; markAll?: boolean };

    if (markAll) {
      await markAlertsRead(uid);
      return NextResponse.json({ success: true });
    }

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json({ error: "Missing alertIds" }, { status: 400 });
    }

    await markAlertsRead(uid, alertIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update alerts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

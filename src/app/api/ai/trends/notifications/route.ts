import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount } from "@/lib/trends/notifications";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const count = Math.min(100, Math.max(1, parseInt(searchParams.get("count") || "20", 10) || 20));

    if (action === "unread-count") {
      const unread = await getUnreadCount(uid);
      return NextResponse.json({ unread });
    }

    const notifications = await getNotifications(uid, { unreadOnly, count });
    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch notifications", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { action, notificationId } = body;

    if (action === "mark-read" && notificationId) {
      await markNotificationRead(uid, notificationId);
      return NextResponse.json({ success: true });
    }

    if (action === "mark-all-read") {
      await markAllNotificationsRead(uid);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update notification", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

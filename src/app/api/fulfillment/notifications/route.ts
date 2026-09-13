import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import type { AppNotification, NotificationType, NotificationPriority } from "@/types/fulfillment";

const COLLECTION = "notifications";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const type = req.nextUrl.searchParams.get("type") as NotificationType | null;
    const read = req.nextUrl.searchParams.get("read");
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("pageSize") || "20", 10)));

    const db = await getAdminDB();
    let query: FirebaseFirestore.Query = db
      .collection("users").doc(uid).collection(COLLECTION)
      .orderBy("createdAt", "desc");

    if (type) {
      query = query.where("type", "==", type);
    }
    if (read === "true") {
      query = query.where("read", "==", true);
    } else if (read === "false") {
      query = query.where("read", "==", false);
    }

    const snapshot = await query.get();
    const allDocs = snapshot.docs;
    const total = allDocs.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const pageDocs = allDocs.slice(start, start + pageSize);

    const notifications = pageDocs.map((d) => ({ id: d.id, ...d.data() })) as AppNotification[];

    const unreadCount = allDocs.filter((d) => !(d.data() as AppNotification).read).length;

    return NextResponse.json({ notifications, total, totalPages, unreadCount, page, pageSize });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch notifications", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.NOTIFICATIONS);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { type, title, message, orderId, priority, actionUrl, metadata } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "type, title, and message are required" },
        { status: 400 }
      );
    }

    const validTypes: NotificationType[] = [
      "order_received", "order_approved", "order_shipped", "order_delivered",
      "order_cancelled", "return_requested", "return_approved", "refund_processed",
      "supplier_alert", "sla_warning", "sla_breach", "inventory_low",
      "bulk_operation_complete", "system_alert",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
    }

    const validPriorities: NotificationPriority[] = ["low", "medium", "high", "urgent"];
    const effectivePriority: NotificationPriority = validPriorities.includes(priority) ? priority : "medium";

    const db = await getAdminDB();
    const now = new Date().toISOString();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);

    const notification: AppNotification = {
      id,
      uid,
      type,
      priority: effectivePriority,
      title,
      message,
      orderId: orderId || undefined,
      read: false,
      actionUrl: actionUrl || undefined,
      metadata: metadata || undefined,
      createdAt: now,
    };

    await db.collection("users").doc(uid).collection(COLLECTION).doc(id).set(notification);

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create notification", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.NOTIFICATIONS);

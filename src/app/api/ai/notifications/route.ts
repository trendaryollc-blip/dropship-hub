import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { DocumentData } from "firebase-admin/firestore";

interface NotificationPayload {
  title: string;
  body: string;
  icon: string;
  url: string;
  severity: "info" | "warning" | "critical";
}

function safeNum(val: unknown, fallback = 0): number {
  return typeof val === "number" ? val : fallback;
}

function safeStr(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    // Get user settings for notification preferences
    const userDoc = await userRef.get();
    const userData = userDoc.data() as DocumentData | undefined;
    const notificationsEnabled = userData?.notifications !== false;

    if (!notificationsEnabled) {
      return NextResponse.json({ skipped: true, reason: "Notifications disabled" });
    }

    // Fetch critical data
    const [
      alertsSnap,
      supplierAlertsSnap,
      csEscalatedSnap,
      revenueSnap,
      pushedErrorsSnap,
    ] = await Promise.all([
      userRef.collection("alerts").where("read", "==", false).orderBy("createdAt", "desc").limit(10).get(),
      userRef.collection("supplierAlerts").where("read", "==", false).where("severity", "==", "high").limit(5).get(),
      userRef.collection("csConversations").where("status", "==", "escalated").limit(5).get(),
      userRef.collection("revenue").orderBy("createdAt", "desc").limit(3).get(),
      userRef.collection("pushedProducts").where("status", "==", "error").limit(5).get(),
    ]);

    const alerts = alertsSnap.docs.map((d) => d.data() as DocumentData);
    const supplierAlerts = supplierAlertsSnap.docs.map((d) => d.data() as DocumentData);
    const escalated = csEscalatedSnap.docs.map((d) => d.data() as DocumentData);
    const revenue = revenueSnap.docs.map((d) => d.data() as DocumentData);
    const erroredProducts = pushedErrorsSnap.docs.map((d) => d.data() as DocumentData);

    const notifications: NotificationPayload[] = [];

    // Check for escalated CS conversations
    if (escalated.length > 0) {
      const names = escalated.slice(0, 2).map((c) => safeStr(c.customerName, "Customer")).join(", ");
      notifications.push({
        title: `${escalated.length} Customer Escalation${escalated.length > 1 ? "s" : ""}`,
        body: `${names} ${escalated.length > 1 ? "need" : "needs"} immediate attention`,
        icon: "customer-service",
        url: "/customer-service",
        severity: "critical",
      });
    }

    // Check for high-severity supplier alerts
    if (supplierAlerts.length > 0) {
      const supplierName = safeStr(supplierAlerts[0].supplierName, "A supplier");
      const alertTitle = safeStr(supplierAlerts[0].title, "performance issue");
      notifications.push({
        title: `Supplier Alert: ${supplierName}`,
        body: alertTitle,
        icon: "supplier",
        url: "/supplier-performance",
        severity: "critical",
      });
    }

    // Check for revenue drops
    if (revenue.length >= 2) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const todayRev = revenue.filter((e) => safeStr(e.date) === today).reduce((s, e) => s + safeNum(e.amount), 0);
      const yesterdayRev = revenue.filter((e) => safeStr(e.date) === yesterday).reduce((s, e) => s + safeNum(e.amount), 0);
      if (yesterdayRev > 0 && todayRev < yesterdayRev * 0.5) {
        const dropPercent = Math.round(((yesterdayRev - todayRev) / yesterdayRev) * 100);
        notifications.push({
          title: `Revenue Down ${dropPercent}%`,
          body: `Today: $${todayRev.toFixed(0)} vs Yesterday: $${yesterdayRev.toFixed(0)}`,
          icon: "revenue",
          url: "/revenue",
          severity: "warning",
        });
      }
    }

    // Check for store push errors
    if (erroredProducts.length > 0) {
      notifications.push({
        title: `${erroredProducts.length} Product Push Failed`,
        body: "Some products failed to push to your store",
        icon: "store",
        url: "/store",
        severity: "warning",
      });
    }

    // Check for unread critical alerts
    const criticalAlerts = alerts.filter((a) => safeStr(a.type) === "warning" || safeStr(a.type) === "risk");
    if (criticalAlerts.length > 0 && notifications.length < 3) {
      notifications.push({
        title: `${criticalAlerts.length} Critical Alert${criticalAlerts.length > 1 ? "s" : ""}`,
        body: safeStr(criticalAlerts[0].title, "Check your alerts"),
        icon: "alert",
        url: "/dashboard",
        severity: "critical",
      });
    }

    if (notifications.length === 0) {
      return NextResponse.json({ sent: 0, message: "No critical issues to notify about" });
    }

    // Save notifications to Firestore for in-app display
    const batch = db.batch();
    for (const notif of notifications) {
      const notifRef = userRef.collection("notifications").doc();
      batch.set(notifRef, {
        ...notif,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    await batch.commit();

    // Try to send FCM push notification (if token exists)
    const fcmToken = localStorage?.getItem?.("fcmToken") || null;
    let pushSent = false;

    if (fcmToken && process.env.FIREBASE_SERVER_KEY) {
      try {
        const payload = {
          notification: {
            title: notifications[0].title,
            body: notifications[0].body,
          },
          data: {
            url: notifications[0].url,
            severity: notifications[0].severity,
          },
          token: fcmToken,
        };

        const fcmRes = await fetch("https://fcm.googleapis.com/v1/projects/" + (process.env.FIREBASE_PROJECT_ID || "") + "/messages:send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getAccessToken()}`,
          },
          body: JSON.stringify({ message: payload }),
        });

        pushSent = fcmRes.ok;
      } catch {
        // FCM send failed — notifications are still saved to Firestore
      }
    }

    return NextResponse.json({
      sent: notifications.length,
      pushSent,
      notifications: notifications.map((n) => ({
        title: n.title,
        severity: n.severity,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Notification scan failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET: Fetch recent notifications for in-app display
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("notifications")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; read?: boolean; [key: string]: unknown }));
    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch notifications", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Helper to get Google Auth token for FCM
async function getAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  if (!serviceAccount.client_email) return "";

  // For server-side FCM, we'd use google-auth-library
  // This is a simplified version — in production use googleapis
  return "";
}

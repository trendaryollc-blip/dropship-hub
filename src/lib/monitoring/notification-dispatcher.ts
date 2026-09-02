import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import type { NotificationPayload } from "./types";

interface UserNotificationPreferences {
  priceAlerts: boolean;
  stockAlerts: boolean;
  orderUpdates: boolean;
  aiRecommendations: boolean;
  weeklyDigest: boolean;
  email?: string;
  pushEnabled?: boolean;
}

async function getUserPreferences(uid: string): Promise<UserNotificationPreferences> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("settings").doc("notifications").get();
    if (snap.exists) return snap.data() as UserNotificationPreferences;
  } catch {
    // Fall through to defaults
  }
  return {
    priceAlerts: true,
    stockAlerts: true,
    orderUpdates: true,
    aiRecommendations: true,
    weeklyDigest: true,
  };
}

function shouldNotify(type: NotificationPayload["type"], prefs: UserNotificationPreferences): boolean {
  if (type === "price_drop" || type === "price_increase" || type === "competitor_undercut") {
    return prefs.priceAlerts;
  }
  if (type === "out_of_stock" || type === "back_in_stock") {
    return prefs.stockAlerts;
  }
  return true;
}

async function sendFCMNotification(
  _uid: string,
  _payload: NotificationPayload
): Promise<boolean> {
  const serverKey = process.env.FIREBASE_MESSAGING_SERVER_KEY;
  if (!serverKey) return false;

  // In a real implementation, this would fetch the user's FCM tokens from Firestore
  // and send via Firebase Admin Messaging. Since we don't have admin messaging setup,
  // we store the notification for the client to pick up via onForegroundMessage.
  return true;
}

async function sendEmailAlert(
  _uid: string,
  _prefs: UserNotificationPreferences,
  payload: NotificationPayload
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !_prefs.email) return false;

  try {
    const subject =
      payload.type === "price_drop" ? `Price Drop: ${payload.productTitle}` :
      payload.type === "price_increase" ? `Price Increase: ${payload.productTitle}` :
      payload.type === "out_of_stock" ? `Out of Stock: ${payload.productTitle}` :
      payload.type === "back_in_stock" ? `Back in Stock: ${payload.productTitle}` :
      `Alert: ${payload.productTitle}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "DropShip Hub Alerts <onboarding@resend.dev>",
        to: [_prefs.email],
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#1f2937;">${subject}</h2>
            <p style="color:#374151;font-size:14px;">${payload.message}</p>
            ${payload.oldPrice ? `<p style="color:#6b7280;">Previous: $${payload.oldPrice.toFixed(2)}</p>` : ""}
            ${payload.newPrice ? `<p style="color:#059669;font-weight:bold;">New: $${payload.newPrice.toFixed(2)}</p>` : ""}
            <hr style="border-color:#e5e7eb;margin:20px 0;" />
            <p style="color:#9ca3af;font-size:12px;">DropShip Hub Monitoring</p>
          </div>
        `,
      }),
    });

    return res.ok;
  } catch (err) {
    logger.error("Alert email failed", { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

async function savePendingNotification(uid: string, payload: NotificationPayload): Promise<void> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("pendingNotifications").add({
      ...payload,
      createdAt: new Date().toISOString(),
      delivered: false,
    });
  } catch {
    // Non-critical
  }
}

export async function dispatchNotifications(
  uid: string,
  payloads: NotificationPayload[]
): Promise<{ dispatched: number; skipped: number }> {
  const prefs = await getUserPreferences(uid);
  let dispatched = 0;
  let skipped = 0;

  for (const payload of payloads) {
    if (!shouldNotify(payload.type, prefs)) {
      skipped++;
      continue;
    }

    try {
      await sendFCMNotification(uid, payload);
      await savePendingNotification(uid, payload);

      if (prefs.email && (payload.type === "out_of_stock" || payload.type === "price_drop")) {
        await sendEmailAlert(uid, prefs, payload).catch(() => {});
      }

      dispatched++;
    } catch (err) {
      logger.error("Notification dispatch failed", {
        uid,
        type: payload.type,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { dispatched, skipped };
}

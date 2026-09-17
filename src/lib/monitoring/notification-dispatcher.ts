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
  uid: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const { getMessaging } = await import("firebase-admin/messaging");
    const messaging = getMessaging();
    const db = await getAdminDB();

    const tokensSnap = await db.collection("users").doc(uid).collection("fcmTokens").get();
    if (tokensSnap.empty) return false;

    const tokens = tokensSnap.docs.map((d) => d.data().token as string).filter(Boolean);
    if (tokens.length === 0) return false;

    const subject =
      payload.type === "price_drop" ? `Price Drop: ${payload.productTitle}` :
      payload.type === "price_increase" ? `Price Increase: ${payload.productTitle}` :
      payload.type === "out_of_stock" ? `Out of Stock: ${payload.productTitle}` :
      payload.type === "back_in_stock" ? `Back in Stock: ${payload.productTitle}` :
      `Alert: ${payload.productTitle}`;

    const message = {
      notification: {
        title: subject,
        body: payload.message,
      },
      data: {
        type: payload.type,
        productId: payload.productId,
        url: "/monitoring",
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === "messaging/registration-token-not-registered") {
        failedTokens.push(tokens[idx]);
      }
    });

    if (failedTokens.length > 0) {
      const batch = db.batch();
      for (const token of failedTokens) {
        const snap = await db.collection("users").doc(uid).collection("fcmTokens").where("token", "==", token).get();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
      }
      await batch.commit();
    }

    return response.successCount > 0;
  } catch {
    return false;
  }
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
      const fcmSent = await sendFCMNotification(uid, payload);
      await savePendingNotification(uid, payload);

      if (prefs.email && (payload.type === "out_of_stock" || payload.type === "price_drop" || payload.type === "competitor_undercut")) {
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

import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { logWebhookEvent } from "./event-log";
import type { OutgoingWebhook, OutgoingWebhookPayload, WebhookEvent } from "./types";
import crypto from "crypto";

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function sendWebhookRequest(
  webhook: OutgoingWebhook,
  payload: OutgoingWebhookPayload,
  timeoutMs: number = 30000
): Promise<{ status: number; body: string }> {
  const body = JSON.stringify(payload);
  const signature = signPayload(body, webhook.secret);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": payload.event,
        "X-Webhook-Timestamp": payload.timestamp,
        "User-Agent": "DropShipHub-Webhook/1.0",
      },
      body,
      signal: controller.signal,
    });

    const responseBody = await response.text().catch(() => "");
    return { status: response.status, body: responseBody };
  } finally {
    clearTimeout(timeout);
  }
}

export async function dispatchOutgoingWebhook(
  uid: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<{ dispatched: number; failed: number }> {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("outgoingWebhooks")
      .where("active", "==", true)
      .get();

    if (snap.empty) return { dispatched: 0, failed: 0 };

    let dispatched = 0;
    let failed = 0;

    const payload: OutgoingWebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      source: "dropship-hub",
    };

    for (const doc of snap.docs) {
      const webhook = doc.data() as OutgoingWebhook;
      webhook.id = doc.id;

      if (!webhook.events.includes(event)) continue;

      const startTime = Date.now();
      try {
        const result = await sendWebhookRequest(webhook, payload);
        const duration = Date.now() - startTime;

        await doc.ref.update({
          lastTriggeredAt: new Date().toISOString(),
          lastStatus: result.status >= 200 && result.status < 300 ? "success" : "failed",
        });

        await logWebhookEvent({
          uid,
          direction: "outgoing",
          webhookId: doc.id,
          event,
          source: webhook.url,
          payload: data,
          response: { status: result.status, body: result.body },
          duration,
        });

        if (result.status >= 200 && result.status < 300) {
          dispatched++;
        } else {
          failed++;
        }
      } catch (err) {
        const duration = Date.now() - startTime;
        const errorMsg = err instanceof Error ? err.message : String(err);

        await doc.ref.update({
          lastTriggeredAt: new Date().toISOString(),
          lastStatus: "failed",
        });

        await logWebhookEvent({
          uid,
          direction: "outgoing",
          webhookId: doc.id,
          event,
          source: webhook.url,
          payload: data,
          error: errorMsg,
          duration,
        });

        failed++;
        logger.error("Outgoing webhook failed", { uid, webhookId: doc.id, error: errorMsg });
      }
    }

    return { dispatched, failed };
  } catch (err) {
    logger.error("Failed to dispatch outgoing webhooks", { uid, error: err instanceof Error ? err.message : String(err) });
    return { dispatched: 0, failed: 0 };
  }
}

export async function retryWebhook(
  uid: string,
  webhookLogId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getAdminDB();
    const logDoc = await db.collection("users").doc(uid).collection("webhookLogs").doc(webhookLogId).get();
    if (!logDoc.exists) return { success: false, error: "Log entry not found" };

    const log = logDoc.data();
    if (!log) return { success: false, error: "Log data missing" };

    const webhookDoc = await db.collection("users").doc(uid).collection("outgoingWebhooks").doc(log.webhookId).get();
    if (!webhookDoc.exists) return { success: false, error: "Webhook not found" };

    const webhook = webhookDoc.data() as OutgoingWebhook;
    webhook.id = webhookDoc.id;

    const payload: OutgoingWebhookPayload = {
      event: log.event,
      timestamp: new Date().toISOString(),
      data: log.payload,
      source: "dropship-hub-retry",
    };

    const result = await sendWebhookRequest(webhook, payload);

    await logWebhookEvent({
      uid,
      direction: "outgoing",
      webhookId: log.webhookId,
      event: log.event,
      source: webhook.url,
      payload: log.payload,
      response: { status: result.status, body: result.body },
      duration: 0,
    });

    return { success: result.status >= 200 && result.status < 300 };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

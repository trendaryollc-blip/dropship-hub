import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { logWebhookEvent } from "./event-log";
import { dispatchOutgoingWebhook } from "./outgoing";
import type { IncomingWebhook, WebhookEvent, WebhookSource, WebhookStatus } from "./types";

export async function processIncomingWebhook(params: {
  uid: string;
  source: WebhookSource;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
}): Promise<{ id: string; status: WebhookStatus }> {
  const { uid, source, event, payload, headers } = params;

  try {
    const db = await getAdminDB();
    const docRef = await db.collection("users").doc(uid).collection("incomingWebhooks").add({
      uid,
      source,
      event,
      payload,
      headers,
      status: "processing",
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const startTime = Date.now();

    try {
      await handleWebhookEvent(uid, source, event, payload);

      await docRef.update({
        status: "completed",
        processedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await logWebhookEvent({
        uid,
        direction: "incoming",
        webhookId: docRef.id,
        event,
        source,
        payload,
        response: { status: 200, body: "OK" },
        duration: Date.now() - startTime,
      });

      await dispatchOutgoingWebhook(uid, event, payload);

      return { id: docRef.id, status: "completed" };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      await docRef.update({
        status: "failed",
        lastError: errorMsg,
        updatedAt: new Date().toISOString(),
      });

      await logWebhookEvent({
        uid,
        direction: "incoming",
        webhookId: docRef.id,
        event,
        source,
        payload,
        error: errorMsg,
        duration: Date.now() - startTime,
      });

      logger.error("Incoming webhook processing failed", { uid, source, event, error: errorMsg });

      return { id: docRef.id, status: "failed" };
    }
  } catch (err) {
    logger.error("Failed to process incoming webhook", { uid, source, event, error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

async function handleWebhookEvent(
  uid: string,
  source: WebhookSource,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const _db = await getAdminDB();

  switch (event) {
    case "order.created":
      await handleOrderCreated(uid, source, payload);
      break;
    case "order.updated":
      await handleOrderUpdated(uid, source, payload);
      break;
    case "order.cancelled":
      await handleOrderCancelled(uid, source, payload);
      break;
    case "refund.created":
      await handleRefundCreated(uid, source, payload);
      break;
    case "inventory.updated":
      await handleInventoryUpdated(uid, source, payload);
      break;
    case "product.updated":
      await handleProductUpdated(uid, source, payload);
      break;
    case "custom":
      logger.info("Custom webhook received", { uid, source, payload });
      break;
  }
}

async function handleOrderCreated(uid: string, source: WebhookSource, payload: Record<string, unknown>): Promise<void> {
  const db = await getAdminDB();

  const existingOrder = await db
    .collection("users")
    .doc(uid)
    .collection("fulfillmentOrders")
    .where("storeOrderId", "==", String(payload.orderId || payload.id))
    .where("storePlatform", "==", source)
    .limit(1)
    .get();

  if (!existingOrder.empty) return;

  const items = Array.isArray(payload.items) ? payload.items : [];
  const customer = (payload.customer || {}) as Record<string, unknown>;

  await db.collection("users").doc(uid).collection("fulfillmentOrders").add({
    storeOrderId: String(payload.orderId || payload.id),
    storePlatform: source,
    storeName: String(payload.storeName || source),
    orderNumber: String(payload.orderNumber || payload.order_id || `WH-${payload.orderId || payload.id}`),
    customerName: String(customer.name || payload.customerName || ""),
    customerEmail: String(customer.email || payload.customerEmail || ""),
    shippingAddress: payload.shippingAddress || payload.shipping_address || {},
    items,
    status: "pending",
    platformOrders: [],
    totalRevenue: Number(payload.totalRevenue || payload.total_price || 0),
    totalCost: 0,
    profit: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function handleOrderUpdated(uid: string, source: WebhookSource, payload: Record<string, unknown>): Promise<void> {
  const db = await getAdminDB();
  const orderId = String(payload.orderId || payload.id);

  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("fulfillmentOrders")
    .where("storeOrderId", "==", orderId)
    .where("storePlatform", "==", source)
    .limit(1)
    .get();

  if (snap.empty) return;

  const doc = snap.docs[0];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (payload.status) updates.status = payload.status;
  if (payload.trackingNumber) updates.trackingNumber = payload.trackingNumber;
  if (payload.trackingCompany) updates.trackingCompany = payload.trackingCompany;

  await doc.ref.update(updates);
}

async function handleOrderCancelled(uid: string, source: WebhookSource, payload: Record<string, unknown>): Promise<void> {
  const db = await getAdminDB();
  const orderId = String(payload.orderId || payload.id);

  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("fulfillmentOrders")
    .where("storeOrderId", "==", orderId)
    .where("storePlatform", "==", source)
    .limit(1)
    .get();

  if (snap.empty) return;

  await snap.docs[0].ref.update({
    status: "cancelled",
    updatedAt: new Date().toISOString(),
  });
}

async function handleRefundCreated(uid: string, source: WebhookSource, payload: Record<string, unknown>): Promise<void> {
  const db = await getAdminDB();

  await db.collection("users").doc(uid).collection("returnRequests").add({
    uid,
    orderId: String(payload.orderId || payload.id),
    source,
    amount: Number(payload.amount || 0),
    reason: String(payload.reason || ""),
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function handleInventoryUpdated(uid: string, source: WebhookSource, payload: Record<string, unknown>): Promise<void> {
  const db = await getAdminDB();
  const productId = String(payload.productId || payload.sku || "");

  if (!productId) return;

  const monitoredSnap = await db
    .collection("users")
    .doc(uid)
    .collection("monitoredProducts")
    .where("productId", "==", productId)
    .limit(1)
    .get();

  if (monitoredSnap.empty) return;

  const doc = monitoredSnap.docs[0];
  const stockQuantity = Number(payload.stockQuantity || payload.quantity || 0);

  await doc.ref.update({
    stockStatus: stockQuantity > 0 ? "in_stock" : "out_of_stock",
    lastChecked: new Date().toISOString(),
  });
}

async function handleProductUpdated(uid: string, source: WebhookSource, payload: Record<string, unknown>): Promise<void> {
  const db = await getAdminDB();
  const productId = String(payload.productId || payload.sku || "");

  if (!productId) return;

  const monitoredSnap = await db
    .collection("users")
    .doc(uid)
    .collection("monitoredProducts")
    .where("productId", "==", productId)
    .limit(1)
    .get();

  if (monitoredSnap.empty) return;

  const doc = monitoredSnap.docs[0];
  const updates: Record<string, unknown> = { lastChecked: new Date().toISOString() };

  if (payload.price !== undefined) updates.currentPrice = Number(payload.price);
  if (payload.title) updates.productTitle = String(payload.title);
  if (payload.imageUrl) updates.productImage = String(payload.imageUrl);

  await doc.ref.update(updates);
}

export async function getIncomingWebhooks(
  uid: string,
  options: { limit?: number; offset?: number; status?: WebhookStatus } = {}
): Promise<{ webhooks: IncomingWebhook[]; total: number }> {
  try {
    const db = await getAdminDB();
    let query: FirebaseFirestore.Query = db.collection("users").doc(uid).collection("incomingWebhooks");

    if (options.status) {
      query = query.where("status", "==", options.status);
    }

    const countSnap = await query.count().get();
    const total = countSnap.data().count;

    query = query.orderBy("createdAt", "desc");

    if (options.offset) {
      const offsetSnap = await query.limit(options.offset).get();
      const lastDoc = offsetSnap.docs[offsetSnap.docs.length - 1];
      if (lastDoc) query = query.startAfter(lastDoc);
    }

    const snap = await query.limit(options.limit || 50).get();
    const webhooks: IncomingWebhook[] = snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    })) as IncomingWebhook[];

    return { webhooks, total };
  } catch (err) {
    logger.error("Failed to get incoming webhooks", { uid, error: err instanceof Error ? err.message : String(err) });
    return { webhooks: [], total: 0 };
  }
}

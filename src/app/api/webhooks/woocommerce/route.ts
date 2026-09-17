import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { broadcast } from "@/app/api/store/events/route";
import crypto from "crypto";

function verifyWooWebhook(body: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const topic = req.headers.get("x-wc-webhook-topic") || "";
  const source = req.headers.get("x-wc-webhook-source") || "";
  const signature = req.headers.get("x-wc-webhook-signature") || "";

  const body = await req.text();

  try {
    const db = await getAdminDB();

    // Find matching WooCommerce connection
    const usersSnap = await db.collection("users").get();
    let matchedUserDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    let matchedConn: FirebaseFirestore.DocumentSnapshot | null = null;

    for (const userDoc of usersSnap.docs) {
      const connsSnap = await userDoc.ref.collection("storeConnections")
        .where("platform", "==", "woocommerce")
        .get();

      const conn = connsSnap.docs.find((d) => {
        const url = d.data().url || "";
        try {
          return source.includes(new URL(url).hostname);
        } catch {
          return false;
        }
      });

      if (conn) {
        matchedUserDoc = userDoc;
        matchedConn = conn;
        break;
      }
    }

    if (!matchedConn || !matchedUserDoc) {
      return NextResponse.json({ error: "No matching store connection" }, { status: 404 });
    }

    // Verify webhook signature if secret is configured
    const webhookSecret = matchedConn.data()?.webhookSecret || process.env.WOO_WEBHOOK_SECRET || "";
    if (webhookSecret && signature) {
      if (!verifyWooWebhook(body, signature, webhookSecret)) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    } else if (!webhookSecret) {
      console.warn(`WooCommerce webhook from ${source} rejected: no webhook secret configured for store ${matchedConn.id}`);
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 501 });
    }

    const data = JSON.parse(body);
    const uid = matchedUserDoc.id;
    const conn = matchedConn;

    if (topic === "order.created" || topic === "order.updated") {
      const order = data;
      const orderId = String(order.id);

      const shipping = order.shipping || {};
      const billing = order.billing || {};

      await matchedUserDoc.ref.collection("webhookOrders").doc(orderId).set({
        orderId,
        orderNumber: `#${order.number}`,
        customerName: `${shipping.first_name || ""} ${shipping.last_name || ""}`.trim() || `${billing.first_name || ""} ${billing.last_name || ""}`.trim(),
        customerEmail: billing.email || "",
        totalAmount: parseFloat(order.total || "0"),
        currency: order.currency || "USD",
        status: order.status || "pending",
        fulfillmentStatus: order.status === "completed" ? "fulfilled" : "unfulfilled",
        items: (order.line_items || []).map((item: Record<string, unknown>) => ({
          productId: String(item.product_id || ""),
          title: String(item.name || ""),
          quantity: Number(item.quantity || 1),
          unitPrice: parseFloat(String(item.price || "0")),
          totalPrice: parseFloat(String(item.total || "0")),
        })),
        storeId: conn.id,
        storeName: conn.data()?.name || source,
        storePlatform: "woocommerce",
        createdAt: order.date_created || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      broadcast(uid, "order_updated", { orderId, source, topic });
    }

    if (topic === "product.updated") {
      broadcast(uid, "inventory_updated", { productId: String(data.id), source });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[woocommerce-webhook] Error processing webhook:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

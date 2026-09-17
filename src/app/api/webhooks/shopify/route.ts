import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { broadcast } from "@/app/api/store/events/route";
import crypto from "crypto";

function verifyShopifyHmac(body: string, hmacHeader: string, secret: string): boolean {
  const hash = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  return hash === hmacHeader;
}

export async function POST(req: NextRequest) {
  const topic = req.headers.get("x-shopify-topic") || "";
  const shopDomain = req.headers.get("x-shopify-shop-domain") || "";
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256") || "";

  const body = await req.text();

  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET || "";
  if (!webhookSecret) {
    console.warn(`Shopify webhook from ${shopDomain} rejected: SHOPIFY_WEBHOOK_SECRET not configured`);
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 501 });
  }
  if (!verifyShopifyHmac(body, hmacHeader, webhookSecret)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  try {
    const data = JSON.parse(body);
    const db = await getAdminDB();

    if (topic === "orders/create" || topic === "orders/updated") {
      const order = data;
      const usersSnap = await db.collection("users").get();

      for (const userDoc of usersSnap.docs) {
        const connsSnap = await userDoc.ref.collection("storeConnections")
          .where("platform", "==", "shopify")
          .where("storeDomain", "==", shopDomain)
          .get();

        if (connsSnap.empty) continue;

        const uid = userDoc.id;
        const orderId = String(order.id);

        await userDoc.ref.collection("webhookOrders").doc(orderId).set({
          orderId,
          orderNumber: `#${order.order_number}`,
          customerName: `${order.shipping_address?.first_name || ""} ${order.shipping_address?.last_name || ""}`.trim(),
          customerEmail: order.email || "",
          totalAmount: parseFloat(order.total_price || "0"),
          currency: order.currency || "USD",
          status: order.financial_status || "pending",
          fulfillmentStatus: order.fulfillment_status || "unfulfilled",
          items: (order.line_items || []).map((item: Record<string, unknown>) => ({
            productId: String(item.product_id || ""),
            title: String(item.title || ""),
            quantity: Number(item.quantity || 1),
            unitPrice: parseFloat(String(item.price || "0")),
            totalPrice: parseFloat(String(item.price || "0")) * Number(item.quantity || 1),
          })),
          storeId: connsSnap.docs[0].id,
          storeName: connsSnap.docs[0].data().name || shopDomain,
          storePlatform: "shopify",
          createdAt: order.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        broadcast(uid, "order_updated", { orderId, shopDomain, topic });
      }
    }

    if (topic === "products/update") {
      const product = data;
      const usersSnap = await db.collection("users").get();

      for (const userDoc of usersSnap.docs) {
        const connsSnap = await userDoc.ref.collection("storeConnections")
          .where("platform", "==", "shopify")
          .where("storeDomain", "==", shopDomain)
          .get();

        if (connsSnap.empty) continue;

        const uid = userDoc.id;
        broadcast(uid, "inventory_updated", { productId: String(product.id), shopDomain });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[shopify-webhook] Error processing webhook:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

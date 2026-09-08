import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { processIncomingWebhook } from "@/lib/webhooks/incoming";
import { verifyShopifyWebhook } from "@/lib/shopify/webhooks";
import type { WebhookEvent } from "@/lib/webhooks/types";

const TOPIC_TO_EVENT: Record<string, WebhookEvent> = {
  "orders/create": "order.created",
  "orders/updated": "order.updated",
  "orders/cancelled": "order.cancelled",
  "products/create": "product.updated",
  "products/update": "product.updated",
  "products/delete": "product.updated",
  "inventory_levels/update": "inventory.updated",
  "refunds/create": "refund.created",
};

function transformShopifyOrder(data: Record<string, unknown>): Record<string, unknown> {
  const lineItems = Array.isArray(data.line_items) ? data.line_items : [];
  const shipping = (data.shipping_address || {}) as Record<string, unknown>;
  const customer = (data.customer || {}) as Record<string, unknown>;

  return {
    orderId: String(data.id || ""),
    orderNumber: data.order_number ? String(data.order_number) : `SHOP-${data.id}`,
    totalRevenue: parseFloat(String(data.total_price || "0")),
    currency: String(data.currency || "USD"),
    status: String(data.financial_status || "pending"),
    fulfillmentStatus: String(data.fulfillment_status || "unfulfilled"),
    customerName: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
    customerEmail: String(customer.email || data.email || ""),
    shippingAddress: {
      fullName: `${shipping.first_name || ""} ${shipping.last_name || ""}`.trim(),
      street: String(shipping.address1 || ""),
      city: String(shipping.city || ""),
      state: String(shipping.province_code || shipping.province || ""),
      zipCode: String(shipping.zip || ""),
      country: String(shipping.country_code || "US"),
      phone: String(shipping.phone || ""),
    },
    items: lineItems.map((item: Record<string, unknown>) => ({
      productId: String(item.product_id || ""),
      name: String(item.title || ""),
      price: parseFloat(String(item.price || "0")),
      quantity: Number(item.quantity || 1),
      sku: String(item.sku || ""),
      variantId: String(item.variant_id || ""),
    })),
    createdAt: String(data.created_at || new Date().toISOString()),
    updatedAt: String(data.updated_at || new Date().toISOString()),
  };
}

function transformShopifyProduct(data: Record<string, unknown>): Record<string, unknown> {
  return {
    productId: String(data.id || ""),
    title: String(data.title || ""),
    bodyHtml: String(data.body_html || ""),
    vendor: String(data.vendor || ""),
    productType: String(data.product_type || ""),
    status: String(data.status || "active"),
    tags: Array.isArray(data.tags) ? data.tags : String(data.tags || "").split(", "),
    images: Array.isArray(data.images)
      ? data.images.map((img: Record<string, unknown>) => ({
          src: String(img.src || ""),
          alt: String(img.alt || ""),
        }))
      : [],
    variants: Array.isArray(data.variants)
      ? data.variants.map((v: Record<string, unknown>) => ({
          id: String(v.id || ""),
          title: String(v.title || ""),
          price: parseFloat(String(v.price || "0")),
          sku: String(v.sku || ""),
          inventoryQuantity: Number(v.inventory_quantity || 0),
        }))
      : [],
    createdAt: String(data.created_at || new Date().toISOString()),
    updatedAt: String(data.updated_at || new Date().toISOString()),
  };
}

function transformShopifyInventory(data: Record<string, unknown>): Record<string, unknown> {
  return {
    inventoryItemId: String(data.inventory_item_id || ""),
    locationId: String(data.location_id || ""),
    available: Number(data.available || 0),
    productId: String(data.inventory_item_id || ""),
    sku: "",
    updatedAt: new Date().toISOString(),
  };
}

function transformShopifyRefund(data: Record<string, unknown>): Record<string, unknown> {
  const order = (data.order || {}) as Record<string, unknown>;
  return {
    refundId: String(data.id || ""),
    orderId: String(order.id || data.order_id || ""),
    amount: parseFloat(String(data.amount || "0")),
    reason: String(data.reason || ""),
    createdAt: String(data.created_at || new Date().toISOString()),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const hmac = req.headers.get("x-shopify-hmac-sha256") || "";
    const topic = req.headers.get("x-shopify-topic") || "";
    const shopDomain = req.headers.get("x-shopify-shop-domain") || "";

    if (!shopDomain) {
      return NextResponse.json({ error: "Missing shop domain" }, { status: 400 });
    }

    if (!verifyShopifyWebhook(body, hmac)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = TOPIC_TO_EVENT[topic];
    if (!event) {
      return NextResponse.json({ received: true, skipped: true });
    }

    const db = await getAdminDB();
    const storesSnap = await db
      .collectionGroup("storeConnections")
      .where("platform", "==", "shopify")
      .where("status", "==", "connected")
      .where("storeDomain", "==", shopDomain)
      .limit(1)
      .get();

    if (storesSnap.empty) {
      return NextResponse.json({ error: "Store not connected" }, { status: 404 });
    }

    const storeDoc = storesSnap.docs[0];
    const uid = storeDoc.ref.parent.parent?.id;
    if (!uid) {
      return NextResponse.json({ error: "Invalid store" }, { status: 500 });
    }

    const data = JSON.parse(body) as Record<string, unknown>;

    let payload: Record<string, unknown>;
    if (event === "order.created" || event === "order.updated" || event === "order.cancelled") {
      payload = transformShopifyOrder(data);
    } else if (event === "product.updated") {
      payload = transformShopifyProduct(data);
    } else if (event === "inventory.updated") {
      payload = transformShopifyInventory(data);
    } else if (event === "refund.created") {
      payload = transformShopifyRefund(data);
    } else {
      payload = data;
    }

    payload._shopDomain = shopDomain;
    payload._shopifyTopic = topic;

    const result = await processIncomingWebhook({
      uid,
      source: "shopify",
      event,
      payload,
      headers: {
        "x-shopify-topic": topic,
        "x-shopify-shop-domain": shopDomain,
      },
    });

    return NextResponse.json({ received: true, id: result.id, status: result.status });
  } catch (error) {
    console.error("Shopify webhook error:", error);
    return NextResponse.json(
      { error: "Processing failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Shopify webhook endpoint is active",
    topics: Object.keys(TOPIC_TO_EVENT),
  });
}

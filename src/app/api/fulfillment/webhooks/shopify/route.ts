import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDB } from "@/lib/firebase-admin";

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || "";

function verifyShopifyWebhook(data: string, hmacHeader: string): boolean {
  if (!SHOPIFY_WEBHOOK_SECRET) return true;
  const hash = crypto.createHmac("sha256", SHOPIFY_WEBHOOK_SECRET).update(data, "utf8").digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader || ""));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const hmac = req.headers.get("x-shopify-hmac-sha256") || "";

    if (SHOPIFY_WEBHOOK_SECRET && !verifyShopifyWebhook(body, hmac)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const topic = req.headers.get("x-shopify-topic") || "";
    const shopDomain = req.headers.get("x-shopify-shop-domain") || "";
    const data = JSON.parse(body);

    if (topic !== "orders/create") {
      return NextResponse.json({ received: true, skipped: true });
    }

    const db = await getAdminDB();
    const storesSnap = await db.collectionGroup("storeConnections")
      .where("platform", "==", "shopify")
      .where("status", "==", "connected")
      .where("storeDomain", "==", shopDomain)
      .limit(1)
      .get();

    if (storesSnap.empty) {
      return NextResponse.json({ error: "No connected store found" }, { status: 404 });
    }

    const storeDoc = storesSnap.docs[0];
    const uid = storeDoc.ref.parent.parent?.id;
    if (!uid) return NextResponse.json({ error: "Invalid store" }, { status: 500 });

    const existingOrder = await db.collection("users").doc(uid).collection("fulfillmentOrders")
      .where("storeOrderId", "==", String(data.id))
      .where("storePlatform", "==", "shopify")
      .limit(1)
      .get();

    if (!existingOrder.empty) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const items = (data.line_items || []).map((item: Record<string, unknown>) => ({
      productId: String(item.product_id || ""),
      name: String(item.title || ""),
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      source: "unknown",
      supplierId: "unknown",
      supplierName: "No supplier assigned",
      unitCost: 0,
      imageUrl: "",
      platformProductId: String(item.sku || item.product_id || ""),
    }));

    for (const item of items) {
      if (item.productId) {
        const supplierDoc = await db.collection("users").doc(uid).collection("productSuppliers").doc(item.productId.replace(/\//g, "__SLASH__")).get();
        if (supplierDoc.exists) {
          const supplier = supplierDoc.data();
          item.source = supplier?.source || "unknown";
          item.supplierId = supplier?.supplierId || "unknown";
          item.supplierName = supplier?.supplierName || "No supplier assigned";
          item.unitCost = supplier?.unitCost || 0;
        }
      }
    }

    const totalCost = items.reduce((sum: number, item: { unitCost: number; quantity: number }) => sum + item.unitCost * item.quantity, 0);
    const totalRevenue = parseFloat(data.total_price || "0");

    const shippingAddress = {
      fullName: `${data.shipping_address?.first_name || ""} ${data.shipping_address?.last_name || ""}`.trim(),
      email: data.email || "",
      phone: data.shipping_address?.phone || "",
      street: data.shipping_address?.address1 || "",
      city: data.shipping_address?.city || "",
      state: data.shipping_address?.province_code || data.shipping_address?.province || "",
      zipCode: data.shipping_address?.zip || "",
      country: data.shipping_address?.country_code || "US",
    };

    await db.collection("users").doc(uid).collection("fulfillmentOrders").add({
      storeOrderId: String(data.id),
      storePlatform: "shopify",
      storeName: shopDomain,
      orderNumber: data.order_number ? String(data.order_number) : `SHOP-${data.id}`,
      customerName: `${data.customer?.first_name || ""} ${data.customer?.last_name || ""}`.trim(),
      customerEmail: data.customer?.email || data.email || "",
      shippingAddress,
      items,
      status: "pending",
      platformOrders: [],
      totalRevenue,
      totalCost,
      profit: totalRevenue - totalCost,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ received: true, orderId: data.id });
  } catch (error) {
    return NextResponse.json(
      { error: "Webhook processing failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

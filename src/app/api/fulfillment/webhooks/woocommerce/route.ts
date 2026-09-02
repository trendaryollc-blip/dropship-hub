import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDB } from "@/lib/firebase-admin";

const WOO_WEBHOOK_SECRET = process.env.WOO_WEBHOOK_SECRET || "";

function verifyWooWebhook(data: string, signature: string): boolean {
  if (!WOO_WEBHOOK_SECRET) return true;
  const hash = crypto.createHmac("sha256", WOO_WEBHOOK_SECRET).update(data, "utf8").digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature || ""));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-wc-webhook-signature") || "";
    const topic = req.headers.get("x-wc-webhook-topic") || "";
    const source = req.headers.get("x-wc-webhook-source") || "";

    if (WOO_WEBHOOK_SECRET && !verifyWooWebhook(body, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    if (topic !== "order.created") {
      return NextResponse.json({ received: true, skipped: true });
    }

    const data = JSON.parse(body);
    const db = await getAdminDB();

    const storesSnap = await db.collectionGroup("storeConnections")
      .where("platform", "==", "woocommerce")
      .where("status", "==", "connected")
      .limit(5)
      .get();

    let matchedStore = null;
    let matchedUid = null;
    for (const storeDoc of storesSnap.docs) {
      const storeData = storeDoc.data();
      if (source.includes(storeData.url || "")) {
        matchedStore = storeData;
        matchedUid = storeDoc.ref.parent.parent?.id;
        break;
      }
    }

    if (!matchedUid) {
      return NextResponse.json({ error: "No connected store found" }, { status: 404 });
    }

    const uid = matchedUid;
    const existingOrder = await db.collection("users").doc(uid).collection("fulfillmentOrders")
      .where("storeOrderId", "==", String(data.id))
      .where("storePlatform", "==", "woocommerce")
      .limit(1)
      .get();

    if (!existingOrder.empty) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const items = (data.line_items || []).map((item: Record<string, unknown>) => ({
      productId: String(item.product_id || ""),
      name: String(item.name || ""),
      price: parseFloat(String(item.price || "0")),
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
    const totalRevenue = parseFloat(data.total || "0");

    const billing = data.billing || {};
    const shipping = data.shipping || {};
    const shippingAddr = {
      fullName: `${shipping.first_name || ""} ${shipping.last_name || ""}`.trim(),
      email: data.billing?.email || "",
      phone: shipping.phone || "",
      street: shipping.address_1 || "",
      city: shipping.city || "",
      state: shipping.state || "",
      zipCode: shipping.postcode || "",
      country: shipping.country || "US",
    };

    await db.collection("users").doc(uid).collection("fulfillmentOrders").add({
      storeOrderId: String(data.id),
      storePlatform: "woocommerce",
      storeName: matchedStore?.name || "WooCommerce",
      orderNumber: data.number ? String(data.number) : `WC-${data.id}`,
      customerName: `${billing.first_name || ""} ${billing.last_name || ""}`.trim(),
      customerEmail: billing.email || "",
      shippingAddress: shippingAddr,
      items,
      status: "pending",
      platformOrders: [],
      totalRevenue,
      totalCost,
      profit: totalRevenue - totalCost,
      createdAt: data.date_created || new Date().toISOString(),
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

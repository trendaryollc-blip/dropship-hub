import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const topic = req.headers.get("x-etsy-topic") || req.headers.get("x-hook-topic") || "";

    if (!topic.includes("receipt")) {
      return NextResponse.json({ received: true, skipped: true });
    }

    const data = JSON.parse(body);
    const db = await getAdminDB();

    const storesSnap = await db.collectionGroup("storeConnections")
      .where("platform", "==", "etsy")
      .where("status", "==", "connected")
      .limit(5)
      .get();

    if (storesSnap.empty) {
      return NextResponse.json({ error: "No connected store found" }, { status: 404 });
    }

    const storeDoc = storesSnap.docs[0];
    const uid = storeDoc.ref.parent.parent?.id;
    if (!uid) return NextResponse.json({ error: "Invalid store" }, { status: 500 });

    const receiptId = String(data.receipt_id || data.id || "");
    const existingOrder = await db.collection("users").doc(uid).collection("fulfillmentOrders")
      .where("storeOrderId", "==", receiptId)
      .where("storePlatform", "==", "etsy")
      .limit(1)
      .get();

    if (!existingOrder.empty) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const items = (data.transactions || []).map((txn: Record<string, unknown>) => ({
      productId: String(txn.product_id || ""),
      name: String(txn.title || ""),
      price: parseFloat(String(typeof txn.price === "object" && txn.price !== null && "amount" in txn.price ? (txn.price as { amount: string }).amount : txn.price || "0")) / 100,
      quantity: Number(txn.quantity || 1),
      source: "unknown",
      supplierId: "unknown",
      supplierName: "No supplier assigned",
      unitCost: 0,
      imageUrl: "",
      platformProductId: String(txn.product_id || ""),
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
    const totalRevenue = parseFloat(String(data.grandtotal?.amount || data.total?.amount || "0")) / 100;

    const addr = data.address || {};
    const shippingAddr = {
      fullName: `${addr.first_name || ""} ${addr.last_name || ""}`.trim(),
      email: data.buyer_email || "",
      phone: addr.phone || "",
      street: addr.line1 || "",
      city: addr.city || "",
      state: addr.state || "",
      zipCode: addr.zip || "",
      country: addr.country_id === 209 ? "US" : String(addr.country_id || "US"),
    };

    await db.collection("users").doc(uid).collection("fulfillmentOrders").add({
      storeOrderId: receiptId,
      storePlatform: "etsy",
      storeName: "Etsy",
      orderNumber: `ETSY-${receiptId}`,
      customerName: `${addr.first_name || ""} ${addr.last_name || ""}`.trim(),
      customerEmail: data.buyer_email || "",
      shippingAddress: shippingAddr,
      items,
      status: "pending",
      platformOrders: [],
      totalRevenue,
      totalCost,
      profit: totalRevenue - totalCost,
      createdAt: data.create_timestamp ? new Date(data.create_timestamp * 1000).toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ received: true, receiptId });
  } catch (error) {
    return NextResponse.json(
      { error: "Webhook processing failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

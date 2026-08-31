import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { fetchOrdersFromStore } from "@/lib/fulfillment/store-adapters";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

function sanitizeProductId(id: string): string {
  return id.replace(/\//g, "__SLASH__");
}

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { storeId } = body;

    const db = await getAdminDB();

    let stores: Array<Record<string, unknown>> = [];
    if (storeId) {
      const doc = await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).get();
      if (doc.exists) stores = [{ id: doc.id, ...(doc.data() ?? {}) }];
    } else {
      const snap = await db.collection("users").doc(uid).collection("storeConnections").where("status", "==", "connected").get();
      stores = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    const allOrders: Array<Record<string, unknown>> = [];

    for (const store of stores) {
      const config = {
        platform: String(store.platform),
        url: String(store.url || store.backendUrl || ""),
        apiKey: String(store.apiKey || ""),
        apiSecret: String(store.apiSecret || ""),
        accessToken: String(store.accessToken || ""),
      };

      const orders = await fetchOrdersFromStore(config);

      for (const order of orders) {
        const existingDoc = await db.collection("users").doc(uid).collection("fulfillmentOrders").where("storeOrderId", "==", order.id).where("storePlatform", "==", store.platform).limit(1).get();

        if (existingDoc.empty) {
          const itemsWithSupplier = await Promise.all(
            order.items.map(async (item) => {
              const supplierDoc = await db.collection("users").doc(uid).collection("productSuppliers").doc(sanitizeProductId(item.productId)).get();
              const supplier = supplierDoc.data();
              return {
                ...item,
                source: supplier?.source || "unknown",
                supplierId: supplier?.supplierId || "unknown",
                supplierName: supplier?.supplierName || "No supplier assigned",
                unitCost: supplier?.unitCost || 0,
              };
            })
          );

          const totalCost = itemsWithSupplier.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);

          await db.collection("users").doc(uid).collection("fulfillmentOrders").add({
            storeOrderId: order.id,
            storePlatform: store.platform,
            storeName: store.name || store.platform,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            shippingAddress: order.shippingAddress,
            items: itemsWithSupplier,
            status: "pending",
            platformOrders: [],
            totalRevenue: order.total,
            totalCost,
            profit: order.total - totalCost,
            createdAt: order.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          allOrders.push({ ...order, storePlatform: store.platform });
        }
      }
    }

    return NextResponse.json({ success: true, newOrders: allOrders.length, orders: allOrders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to poll orders", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.FULFILLMENT);

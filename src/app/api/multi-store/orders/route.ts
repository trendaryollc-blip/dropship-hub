import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { addUnifiedOrder, updateUnifiedOrder } from "@/lib/data/multi-store";
import { safeErrorMessage } from "@/lib/api-errors";
import type { UnifiedOrder } from "@/types/multi-store";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId") || undefined;
    const status = searchParams.get("status") || undefined;
    const limitParam = searchParams.get("limit");

    // Serve the orders webhooks actually delivered (webhookOrders) — these are
    // the real store orders the action route can fulfill/cancel/track. The
    // unifiedOrders collection has no real writer, and its ids would 404 in
    // the action route. No orderBy in the query: combining orderBy with where
    // on other fields requires a composite index — sort in memory instead.
    const db = await getAdminDB();
    let q: FirebaseFirestore.Query = db.collection("users").doc(uid).collection("webhookOrders");
    if (storeId) q = q.where("storeId", "==", storeId);
    if (status) q = q.where("status", "==", status);
    q = q.limit(limitParam ? Math.min(parseInt(limitParam, 10) || 100, 500) : 200);

    const snap = await q.get();
    const emptyAddress = { fullName: "", street: "", city: "", state: "", zipCode: "", country: "" };
    const orders = snap.docs
      .map((d) => {
        const o = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          orderId: (o.orderId as string) || d.id,
          storeId: (o.storeId as string) || "",
          storeName: (o.storeName as string) || "",
          storePlatform: (o.storePlatform as string) || "",
          orderNumber: (o.orderNumber as string) || `#${d.id}`,
          customerName: (o.customerName as string) || "",
          customerEmail: (o.customerEmail as string) || "",
          items: (o.items as UnifiedOrder["items"]) || [],
          totalAmount: (o.totalAmount as number) || 0,
          currency: (o.currency as string) || "USD",
          status: (o.status as UnifiedOrder["status"]) || "pending",
          fulfillmentStatus: (o.fulfillmentStatus as UnifiedOrder["fulfillmentStatus"]) || "unfulfilled",
          trackingNumber: o.trackingNumber as string | undefined,
          shippingAddress: (o.shippingAddress as UnifiedOrder["shippingAddress"]) || emptyAddress,
          createdAt: (o.createdAt as string) || "",
          updatedAt: (o.updatedAt as string) || "",
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch unified orders", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { storeId, storeName, storePlatform, orderNumber, customerName, customerEmail, items, totalAmount, currency, status, shippingAddress } = body;

    if (!storeId || !orderNumber || !customerName || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const orderId = await addUnifiedOrder(uid, {
      orderId: `ORD-${Date.now()}`,
      storeId,
      storeName: storeName || "",
      storePlatform: storePlatform || "",
      orderNumber,
      customerName,
      customerEmail: customerEmail || "",
      items,
      totalAmount: totalAmount || 0,
      currency: currency || "USD",
      status: status || "pending",
      fulfillmentStatus: "unfulfilled",
      shippingAddress: shippingAddress || { fullName: "", street: "", city: "", state: "", zipCode: "", country: "" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: orderId });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create unified order", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const PUT = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { orderId, ...updates } = body;
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    await updateUnifiedOrder(uid, orderId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update order", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

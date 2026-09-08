import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getUnifiedOrders, addUnifiedOrder, updateUnifiedOrder } from "@/lib/data/multi-store";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId") || undefined;
    const status = searchParams.get("status") || undefined;
    const limitParam = searchParams.get("limit");

    const orders = await getUnifiedOrders(uid, {
      storeId,
      status,
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch unified orders", details: error instanceof Error ? error.message : "Unknown" },
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
      { error: "Failed to create unified order", details: error instanceof Error ? error.message : "Unknown" },
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
      { error: "Failed to update order", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

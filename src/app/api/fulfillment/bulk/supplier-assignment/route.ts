import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { orderIds, supplierId, supplierName, reason } = body as {
      orderIds?: string[];
      supplierId?: string;
      supplierName?: string;
      reason?: string;
    };

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: "orderIds array required" }, { status: 400 });
    }

    if (orderIds.length > 50) {
      return NextResponse.json({ error: "Maximum 50 orders per bulk operation" }, { status: 400 });
    }

    if (!supplierId || !supplierName) {
      return NextResponse.json({ error: "supplierId and supplierName required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const now = new Date().toISOString();
    let updated = 0;
    const errors: Array<{ orderId: string; error: string }> = [];

    for (const orderId of orderIds) {
      try {
        const doc = await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).get();

        if (!doc.exists) {
          errors.push({ orderId, error: "Order not found" });
          continue;
        }

        const updateData: Record<string, unknown> = {
          assignedSupplier: supplierName,
          updatedAt: now,
        };

        if (reason) {
          updateData.automationError = reason;
        }

        await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).update(updateData);

        for (const itemId of orderIds) {
          if (itemId === orderId) {
            const orderData = doc.data();
            if (orderData?.items) {
              const updatedItems = orderData.items.map((item: Record<string, unknown>) => ({
                ...item,
                supplierId,
                supplierName,
              }));
              await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).update({ items: updatedItems });
            }
          }
        }

        updated++;
      } catch (error) {
        errors.push({ orderId, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    return NextResponse.json({ success: true, updated, errors });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to assign supplier", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.BULK_OPS);

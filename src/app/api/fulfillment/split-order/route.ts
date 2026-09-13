import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

interface SplitEntry {
  itemIndices: number[];
  newStatus?: string;
}

interface SplitOrderRequest {
  orderId: string;
  splits: SplitEntry[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body: SplitOrderRequest = await req.json();
    const { orderId, splits } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    if (!splits || !Array.isArray(splits) || splits.length < 2) {
      return NextResponse.json({ error: "At least 2 splits are required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const orderRef = db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderDoc.data()!;
    const items = orderData.items || [];
    const totalItems = items.length;

    // Validate all items are accounted for exactly once
    const assignedIndices = new Set<number>();
    for (const split of splits) {
      for (const idx of split.itemIndices) {
        if (idx < 0 || idx >= totalItems) {
          return NextResponse.json({ error: `Invalid item index: ${idx}` }, { status: 400 });
        }
        if (assignedIndices.has(idx)) {
          return NextResponse.json({ error: `Item index ${idx} is assigned to multiple splits` }, { status: 400 });
        }
        assignedIndices.add(idx);
      }
    }

    if (assignedIndices.size !== totalItems) {
      return NextResponse.json(
        { error: `Not all items are assigned. ${totalItems - assignedIndices.size} items missing.` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newOrderIds: string[] = [];
    const splitResults: Array<{ orderId: string; items: number; totalRevenue: number }> = [];
    const batch = db.batch();

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      const splitItems = split.itemIndices.map((idx) => items[idx]);

      // Calculate totals for this split
      const splitRevenue = splitItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const splitCost = splitItems.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
      const splitProfit = Math.round((splitRevenue - splitCost) * 100) / 100;

      if (i === 0) {
        // First split keeps the original order ID
        batch.update(orderRef, {
          items: splitItems,
          totalRevenue: Math.round(splitRevenue * 100) / 100,
          totalCost: Math.round(splitCost * 100) / 100,
          profit: splitProfit,
          status: split.newStatus || orderData.status,
          updatedAt: now,
        });

        newOrderIds.push(orderId);
        splitResults.push({
          orderId,
          items: splitItems.length,
          totalRevenue: Math.round(splitRevenue * 100) / 100,
        });
      } else {
        // Create new order for subsequent splits
        const newOrderId = generateId();
        const newOrderRef = db.collection("users").doc(uid).collection("fulfillmentOrders").doc(newOrderId);

        batch.set(newOrderRef, {
          ...orderData,
          id: newOrderId,
          trendaryoOrderId: `TR-${newOrderId.toUpperCase()}`,
          items: splitItems,
          totalRevenue: Math.round(splitRevenue * 100) / 100,
          totalCost: Math.round(splitCost * 100) / 100,
          profit: splitProfit,
          status: split.newStatus || orderData.status,
          createdAt: now,
          updatedAt: now,
        });

        newOrderIds.push(newOrderId);
        splitResults.push({
          orderId: newOrderId,
          items: splitItems.length,
          totalRevenue: Math.round(splitRevenue * 100) / 100,
        });
      }
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      originalOrderId: orderId,
      newOrderIds: newOrderIds.slice(1), // exclude original
      splits: splitResults,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to split order", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import type { FulfillmentOrder } from "@/types/fulfillment";

const VALID_STATUSES: FulfillmentOrder["status"][] = ["pending", "in_progress", "shipped", "delivered", "cancelled"];

const VALID_TRANSITIONS: Record<string, FulfillmentOrder["status"][]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { orderIds, newStatus, note } = body as {
      orderIds?: string[];
      newStatus?: FulfillmentOrder["status"];
      note?: string;
    };

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: "orderIds array required" }, { status: 400 });
    }

    if (orderIds.length > 50) {
      return NextResponse.json({ error: "Maximum 50 orders per bulk operation" }, { status: 400 });
    }

    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
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

        const orderData = doc.data() as FulfillmentOrder;
        const currentStatus = orderData.status;

        if (currentStatus === newStatus) {
          errors.push({ orderId, error: `Order already in "${newStatus}" status` });
          continue;
        }

        const allowed = VALID_TRANSITIONS[currentStatus] as FulfillmentOrder["status"][] | undefined;
        if (!allowed || !allowed.includes(newStatus)) {
          errors.push({ orderId, error: `Cannot transition from "${currentStatus}" to "${newStatus}"` });
          continue;
        }

        const updateData: Record<string, unknown> = {
          status: newStatus,
          updatedAt: now,
        };

        if (note) {
          updateData.automationError = note;
        }

        if (newStatus === "delivered") {
          updateData.deliveredAt = now;
        } else if (newStatus === "shipped") {
          updateData.shippedAt = now;
        }

        await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).update(updateData);
        updated++;
      } catch (error) {
        errors.push({ orderId, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    return NextResponse.json({ success: true, updated, errors });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update orders", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.BULK_OPS);

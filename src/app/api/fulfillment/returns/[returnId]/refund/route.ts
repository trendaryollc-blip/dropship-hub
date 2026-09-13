import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/fulfillment/audit-logger";
import type { ReturnRequest } from "@/types/fulfillment";

const COLLECTION = "returnRequests";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    // Extract returnId from URL path: /api/fulfillment/returns/[returnId]/refund
    const parts = req.nextUrl.pathname.split("/");
    const returnId = parts[parts.length - 2]; // second-to-last segment

    if (!returnId || returnId === "returns") {
      return NextResponse.json({ error: "returnId required" }, { status: 400 });
    }

    const body = await req.json();
    const { refundMethod, refundAmount, note } = body;

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection(COLLECTION).doc(returnId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Return request not found" }, { status: 404 });
    }

    const current = doc.data() as ReturnRequest;

    if (current.status !== "return_received" && current.status !== "refund_processing") {
      return NextResponse.json(
        { error: "Refund can only be processed after return is received" },
        { status: 400 }
      );
    }

    const validMethods = ["original", "store_credit", "manual"];
    const method = validMethods.includes(refundMethod) ? refundMethod : "original";
    const amount = typeof refundAmount === "number" ? refundAmount : current.refundAmount || 0;

    const now = new Date().toISOString();
    const historyEntry = { status: "refunded" as const, timestamp: now, note: `Refund of $${amount.toFixed(2)} via ${method}`, actor: uid };

    await docRef.update({
      status: "refunded",
      refundMethod: method,
      refundAmount: amount,
      refundProcessedAt: now,
      updatedAt: now,
      statusHistory: [...(current.statusHistory || []), historyEntry],
      ...(note ? { internalNotes: [current.internalNotes, note].filter(Boolean).join("\n") } : {}),
    });

    // Update original order to reflect refund
    const orderDoc = await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(current.orderId).get();
    if (orderDoc.exists) {
      await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(current.orderId).update({
        profit: (orderDoc.data()?.profit || 0) - amount,
        updatedAt: now,
      });
    }

    logAuditEvent(uid, {
      orderId: current.orderId,
      action: "settings_updated",
      details: `Refund processed: $${amount.toFixed(2)} via ${method} for return ${returnId}`,
      metadata: { returnId, refundAmount: amount, refundMethod: method },
    });

    const updated = await docRef.get();
    return NextResponse.json({ success: true, returnRequest: { id: updated.id, ...updated.data() } });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process refund", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.RETURNS);

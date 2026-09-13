import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/fulfillment/audit-logger";
import type { ReturnRequest, ReturnStatus } from "@/types/fulfillment";

const COLLECTION = "returnRequests";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    // Extract returnId from URL path: /api/fulfillment/returns/[returnId]
    const parts = req.nextUrl.pathname.split("/");
    const returnId = parts[parts.length - 1];

    if (!returnId || returnId === "returns") {
      return NextResponse.json({ error: "returnId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const doc = await db.collection("users").doc(uid).collection(COLLECTION).doc(returnId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Return request not found" }, { status: 404 });
    }

    return NextResponse.json({ returnRequest: { id: doc.id, ...doc.data() } });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch return request", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.RETURNS);

export const PATCH = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const parts = req.nextUrl.pathname.split("/");
    const returnId = parts[parts.length - 1];

    if (!returnId || returnId === "returns") {
      return NextResponse.json({ error: "returnId required" }, { status: 400 });
    }

    const body = await req.json();
    const { status, note, rmaNumber, returnTrackingNumber, returnLabelUrl } = body;

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection(COLLECTION).doc(returnId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Return request not found" }, { status: 404 });
    }

    const current = doc.data() as ReturnRequest;

    // Validate status transition
    const validTransitions: Record<ReturnStatus, ReturnStatus[]> = {
      requested: ["approved", "denied"],
      approved: ["return_in_transit", "denied"],
      denied: [],
      return_in_transit: ["return_received"],
      return_received: ["refund_processing"],
      refund_processing: ["refunded"],
      refunded: ["closed"],
      closed: [],
    };

    if (status && !validTransitions[current.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from "${current.status}" to "${status}"` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const updates: Partial<ReturnRequest> = { updatedAt: now };
    const historyEntry = { status: status as ReturnStatus, timestamp: now, note, actor: uid };

    if (status) {
      updates.status = status;
      updates.statusHistory = [...(current.statusHistory || []), historyEntry];

      if (status === "approved" || status === "denied") {
        updates.reviewedAt = now;
        updates.reviewedBy = uid;
      }
    }

    if (rmaNumber) updates.supplierRMANumber = rmaNumber;
    if (returnTrackingNumber) updates.returnTrackingNumber = returnTrackingNumber;
    if (returnLabelUrl) updates.returnLabelUrl = returnLabelUrl;
    if (note && !status) {
      updates.internalNotes = [current.internalNotes, note].filter(Boolean).join("\n");
    }

    await docRef.update(updates);

    logAuditEvent(uid, {
      orderId: current.orderId,
      action: "settings_updated",
      details: `Return ${returnId} updated: ${status || "note added"}`,
      metadata: { returnId, newStatus: status },
    });

    const updated = await docRef.get();
    return NextResponse.json({ success: true, returnRequest: { id: updated.id, ...updated.data() } });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update return request", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.RETURNS);

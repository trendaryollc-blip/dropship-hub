import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createRefundCascade, advanceRefundStep, generateDisputeResponse } from "@/lib/refund-cascade";
import {
  addRefundCascade,
  getRefundCascades,
  getRefundCascadeById,
  updateRefundCascade,
  deleteRefundCascade,
  getRefundCascadeStats,
} from "@/lib/data/refund-cascade";
import { safeErrorMessage } from "@/lib/api-errors";

const REFUND_REASONS = ["defective", "wrong_item", "not_as_described", "damaged", "late_delivery", "customer_changed_mind", "quality_issue", "other"];
const str = (v: unknown, max = 200): string => (typeof v === "string" ? v.slice(0, max) : "");

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "list";

    if (type === "stats") {
      const stats = await getRefundCascadeStats(uid);
      return NextResponse.json({ stats });
    }

    const cascades = await getRefundCascades(uid);
    return NextResponse.json({ cascades });
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed") }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { orderId, orderNumber, customerName, customerEmail, productTitle, productImage, orderAmount, reason, reasonDetails } = body;
      if (!orderId || !orderNumber || !customerName || !productTitle || !reason) {
        return NextResponse.json({ error: "orderId, orderNumber, customerName, productTitle and reason are required" }, { status: 400 });
      }
      if (!REFUND_REASONS.includes(reason)) {
        return NextResponse.json({ error: "Invalid refund reason" }, { status: 400 });
      }
      const parsedAmount = Number(orderAmount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1_000_000) {
        return NextResponse.json({ error: "orderAmount must be a positive number" }, { status: 400 });
      }

      const cascade = createRefundCascade({
        orderId: str(orderId, 100),
        orderNumber: str(orderNumber, 100),
        customerName: str(customerName, 120),
        customerEmail: str(customerEmail, 200),
        productTitle: str(productTitle, 200),
        productImage: typeof productImage === "string" && /^https?:\/\//.test(productImage) ? productImage.slice(0, 500) : undefined,
        orderAmount: Math.round(parsedAmount * 100) / 100,
        reason: reason as Parameters<typeof createRefundCascade>[0]["reason"],
        reasonDetails: str(reasonDetails, 1000),
      });

      const id = await addRefundCascade(uid, cascade);
      if (!id) {
        return NextResponse.json({ error: "Failed to save refund cascade" }, { status: 500 });
      }
      return NextResponse.json({ success: true, cascade: { ...cascade, id } });
    }

    if (action === "advance") {
      const { id, stepIndex, success, notes } = body;
      if (!id || stepIndex === undefined) {
        return NextResponse.json({ error: "id and stepIndex are required" }, { status: 400 });
      }
      const existing = await getRefundCascadeById(uid, String(id));
      if (!existing) {
        return NextResponse.json({ error: "Refund cascade not found" }, { status: 404 });
      }
      const updated = advanceRefundStep(existing, Number(stepIndex), success !== false, str(notes, 500) || undefined);
      const ok = await updateRefundCascade(uid, String(id), updated);
      if (!ok) {
        return NextResponse.json({ error: "Failed to save refund cascade" }, { status: 500 });
      }
      return NextResponse.json({ success: true, cascade: updated });
    }

    if (action === "dispute-response") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      }
      const existing = await getRefundCascadeById(uid, String(id));
      if (!existing) {
        return NextResponse.json({ error: "Refund cascade not found" }, { status: 404 });
      }
      const response = generateDisputeResponse(existing);
      return NextResponse.json({ success: true, response });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed") }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const deleted = await deleteRefundCascade(uid, id);
    if (!deleted) return NextResponse.json({ error: "Failed to delete refund cascade" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed") }, { status: 500 });
  }
});

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createRefundCascade, advanceRefundStep, generateDisputeResponse } from "@/lib/refund-cascade";
import type { RefundReason } from "@/types/refund-cascade";
import { safeErrorMessage } from "@/lib/api-errors";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { orderId, orderNumber, customerName, customerEmail, productTitle, productImage, orderAmount, reason, reasonDetails } = body;
      if (!orderId || !orderNumber || !customerName || !productTitle || !orderAmount || !reason) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const cascade = createRefundCascade({
        orderId, orderNumber, customerName, customerEmail: customerEmail || "",
        productTitle, productImage, orderAmount, reason, reasonDetails: reasonDetails || "",
      });
      return NextResponse.json({ success: true, cascade });
    }

    if (action === "advance") {
      const { cascade: cascadeData, stepIndex, success, notes } = body;
      if (!cascadeData || stepIndex === undefined) {
        return NextResponse.json({ error: "Missing cascade or stepIndex" }, { status: 400 });
      }
      const updated = advanceRefundStep(cascadeData, stepIndex, success !== false, notes);
      return NextResponse.json({ success: true, cascade: updated });
    }

    if (action === "dispute-response") {
      const { cascade: cascadeData } = body;
      if (!cascadeData) {
        return NextResponse.json({ error: "Missing cascade" }, { status: 400 });
      }
      const response = generateDisputeResponse(cascadeData);
      return NextResponse.json({ success: true, response });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed") },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    return NextResponse.json({ message: "Refund Cascade API" });
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed") }, { status: 500 });
  }
});

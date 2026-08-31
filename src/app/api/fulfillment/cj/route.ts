import { NextRequest, NextResponse } from "next/server";
import { placeCJOrder, getCJOrderStatus } from "@/lib/fulfillment/cj-adapter";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "placeOrder") {
      const { productId, quantity, shippingAddress } = body;
      if (!productId || !quantity || !shippingAddress) {
        return NextResponse.json({ error: "productId, quantity, and shippingAddress required" }, { status: 400 });
      }
      const result = await placeCJOrder({ productId, quantity, shippingAddress });
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    if (action === "getStatus") {
      const { orderId } = body;
      if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });
      const status = await getCJOrderStatus(orderId);
      return NextResponse.json({ success: true, data: status });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "CJ request failed", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.FULFILLMENT);

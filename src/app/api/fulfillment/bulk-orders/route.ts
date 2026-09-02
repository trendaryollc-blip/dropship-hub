import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { executeBulkOrderPlacement, getBulkOrderResult, validateBulkOrderPlacementInput, getBulkOrderStats, getActiveBulkOperations, getBulkOperationHistory } from "@/lib/fulfillment/bulk-processor";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "stats";
    const operationId = searchParams.get("operationId");

    if (action === "stats") {
      const stats = getBulkOrderStats();
      return NextResponse.json({ success: true, stats });
    }

    if (action === "result" && operationId) {
      const result = getBulkOrderResult(operationId);
      if (!result) {
        return NextResponse.json({ error: "Operation not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, result });
    }

    if (action === "active") {
      const operations = getActiveBulkOperations();
      return NextResponse.json({ success: true, operations });
    }

    if (action === "history") {
      const limit = parseInt(searchParams.get("limit") || "20", 10);
      const history = getBulkOperationHistory(limit);
      return NextResponse.json({ success: true, history });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch bulk order data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { orders, supplierId, autoApprove } = body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: "orders array is required" }, { status: 400 });
    }

    if (!supplierId) {
      return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
    }

    const validation = validateBulkOrderPlacementInput({ orders, supplierId, autoApprove: autoApprove || false });
    if (!validation.valid) {
      return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
    }

    const result = await executeBulkOrderPlacement({
      orders,
      supplierId,
      autoApprove: autoApprove || false,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to execute bulk order placement", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

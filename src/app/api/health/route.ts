import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { calculateBusinessHealth } from "@/lib/business-health";
import { safeErrorMessage } from "@/lib/api-errors";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const health = calculateBusinessHealth({
      financial: { profitMargin: 18, revenueGrowth: 12, cashReserveDays: 21, adSpendRatio: 22, refundRate: 3 },
      operations: { fulfillmentRate: 94, avgShippingDays: 10, orderAccuracy: 97, activeProducts: 15, monitoringActive: true },
      supplier: { avgSupplierScore: 78, activeSuppliers: 4, supplierIssues: 1, autoSwitchActive: true },
      product: { totalProducts: 25, winningProducts: 6, avgProductScore: 72, productsInCompliance: 23 },
    });
    return NextResponse.json({ health });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed") },
      { status: 500 }
    );
  }
});

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { calculateCashFlowForecast, calculateCashFlowSnapshot, generateCashFlowAlerts } from "@/lib/cash-flow";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "snapshot";

    if (type === "forecast") {
      const forecast = calculateCashFlowForecast({
        currentBalance: 2500,
        entries: [
          { type: "inflow", amount: 150, expectedDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0], status: "pending" },
          { type: "inflow", amount: 85, expectedDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0], status: "pending" },
          { type: "inflow", amount: 200, expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0], status: "pending" },
          { type: "outflow", amount: 320, expectedDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0], status: "pending" },
          { type: "outflow", amount: 180, expectedDate: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0], status: "pending" },
          { type: "outflow", amount: 99, expectedDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0], status: "pending" },
        ],
        days: 30,
      });
      return NextResponse.json({ forecast });
    }

    if (type === "alerts") {
      const forecast = calculateCashFlowForecast({ currentBalance: 2500, entries: [], days: 30 });
      const alerts = generateCashFlowAlerts({
        balance: 2500,
        forecast,
        pendingPayments: [
          { description: "CJ Dropshipping Order #1234", amount: 320, dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0], status: "pending" },
        ],
      });
      return NextResponse.json({ alerts });
    }

    // Default: snapshot
    const forecast = calculateCashFlowForecast({
      currentBalance: 2500,
      entries: [
        { type: "inflow", amount: 150, expectedDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0], status: "pending" },
        { type: "inflow", amount: 85, expectedDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0], status: "pending" },
        { type: "inflow", amount: 200, expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0], status: "pending" },
        { type: "outflow", amount: 320, expectedDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0], status: "pending" },
        { type: "outflow", amount: 180, expectedDate: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0], status: "pending" },
      ],
      days: 30,
    });
    const snapshot = calculateCashFlowSnapshot({
      currentBalance: 2500,
      pendingInflows: 435,
      pendingOutflows: 500,
      forecast,
    });
    return NextResponse.json({ snapshot });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
});

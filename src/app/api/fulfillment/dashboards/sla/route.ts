import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import type { SLADashboardData } from "@/types/fulfillment";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("fulfillmentOrders")
      .get();

    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
      id: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      assignedSupplier?: string;
      totalRevenue?: number;
      totalCost?: number;
      profit?: number;
      items?: Array<{ productId: string; name: string; quantity: number; unitCost: number; supplierName: string }>;
    }>;

    const now = Date.now();
    const HOURS_MS = 3600_000;
    const AT_RISK_THRESHOLD = 48;
    const OVERDUE_THRESHOLD = 72;

    let totalFulfillmentHours = 0;
    let completedCount = 0;
    let onTimeCount = 0;
    let atRiskCount = 0;
    let overdueCount = 0;

    const statusCounts: Record<string, { count: number; totalHours: number; onTime: number }> = {};
    const alerts: SLADashboardData["alerts"] = [];

    for (const order of orders) {
      const created = new Date(order.createdAt).getTime();
      const hoursElapsed = (now - created) / HOURS_MS;

      const status = order.status || "pending";
      if (!statusCounts[status]) statusCounts[status] = { count: 0, totalHours: 0, onTime: 0 };
      statusCounts[status].count++;

      const isCompleted = status === "delivered" || status === "shipped";
      if (isCompleted) {
        totalFulfillmentHours += hoursElapsed;
        completedCount++;
        if (hoursElapsed <= 72) {
          onTimeCount++;
          statusCounts[status].onTime++;
        }
        statusCounts[status].totalHours += hoursElapsed;
      }

      if (status !== "delivered" && status !== "cancelled") {
        if (hoursElapsed > OVERDUE_THRESHOLD) {
          overdueCount++;
          alerts.push({
            orderId: order.id,
            orderNumber: order.id.slice(0, 8),
            customerName: "Customer",
            hoursElapsed: Math.round(hoursElapsed),
            expectedBy: new Date(created + OVERDUE_THRESHOLD * HOURS_MS).toISOString(),
            severity: "critical",
            message: `Order overdue by ${Math.round(hoursElapsed - OVERDUE_THRESHOLD)}h`,
          });
        } else if (hoursElapsed > AT_RISK_THRESHOLD) {
          atRiskCount++;
          alerts.push({
            orderId: order.id,
            orderNumber: order.id.slice(0, 8),
            customerName: "Customer",
            hoursElapsed: Math.round(hoursElapsed),
            expectedBy: new Date(created + OVERDUE_THRESHOLD * HOURS_MS).toISOString(),
            severity: "warning",
            message: `Order at risk — ${Math.round(hoursElapsed)}h elapsed`,
          });
        }
      }
    }

    const breakdown: SLADashboardData["breakdown"] = Object.entries(statusCounts).map(([status, data]) => ({
      status,
      count: data.count,
      avgHours: data.count > 0 ? Math.round(data.totalHours / data.count) : 0,
      onTimeRate: data.count > 0 ? Math.round((data.onTime / data.count) * 100) : 100,
    }));

    const sevenDaysAgo = new Date(now - 7 * 24 * HOURS_MS);
    const timeline: SLADashboardData["timeline"] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(sevenDaysAgo.getTime() + i * 24 * HOURS_MS);
      const dayEnd = new Date(dayStart.getTime() + 24 * HOURS_MS);
      const dayStr = dayStart.toISOString().split("T")[0];

      let dayOnTime = 0;
      let dayLate = 0;
      let dayTotal = 0;

      for (const order of orders) {
        const created = new Date(order.createdAt).getTime();
        if (created >= dayStart.getTime() && created < dayEnd.getTime()) {
          dayTotal++;
          const hoursElapsed = (now - created) / HOURS_MS;
          if (order.status === "delivered" || order.status === "shipped") {
            if (hoursElapsed <= 72) dayOnTime++;
            else dayLate++;
          }
        }
      }

      timeline.push({ date: dayStr, onTime: dayOnTime, late: dayLate, total: dayTotal });
    }

    const totalOrders = orders.length;
    const onTimeRate = completedCount > 0 ? Math.round((onTimeCount / completedCount) * 100) : 100;
    const avgFulfillmentHours = completedCount > 0 ? Math.round(totalFulfillmentHours / completedCount) : 0;

    const data: SLADashboardData = {
      summary: { totalOrders, onTimeRate, avgFulfillmentHours, atRiskOrders: atRiskCount, overdueOrders: overdueCount },
      breakdown,
      alerts: alerts.sort((a, b) => b.hoursElapsed - a.hoursElapsed),
      timeline,
    };

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch SLA dashboard", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DASHBOARDS);

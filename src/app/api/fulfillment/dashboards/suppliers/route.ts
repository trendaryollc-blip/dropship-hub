import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import type { SupplierPerformanceData } from "@/types/fulfillment";

interface SupplierStats {
  supplierId: string;
  supplierName: string;
  orderCount: number;
  totalShippingDays: number;
  shippedCount: number;
  onTimeCount: number;
  cancelledCount: number;
  deliveredCount: number;
  totalRevenue: number;
  totalCost: number;
  qualityScores: number[];
  firstHalfOnTime: number;
  firstHalfTotal: number;
  secondHalfOnTime: number;
  secondHalfTotal: number;
}

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
      platformOrders?: Array<{ shippedAt?: string; deliveredAt?: string; status?: string }>;
    }>;

    const supplierMap = new Map<string, SupplierStats>();

    for (const order of orders) {
      const supplierId = order.assignedSupplier || "unassigned";
      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          supplierId,
          supplierName: supplierId,
          orderCount: 0,
          totalShippingDays: 0,
          shippedCount: 0,
          onTimeCount: 0,
          cancelledCount: 0,
          deliveredCount: 0,
          totalRevenue: 0,
          totalCost: 0,
          qualityScores: [],
          firstHalfOnTime: 0,
          firstHalfTotal: 0,
          secondHalfOnTime: 0,
          secondHalfTotal: 0,
        });
      }
      const s = supplierMap.get(supplierId)!;
      s.orderCount++;
      s.totalRevenue += order.totalRevenue || 0;
      s.totalCost += order.totalCost || 0;

      if (order.items && order.items.length > 0) {
        const name = order.items[0].supplierName;
        if (name) s.supplierName = name;
      }

      const status = order.status;
      if (status === "cancelled") s.cancelledCount++;
      if (status === "delivered" || status === "shipped") s.shippedCount++;

      if (status === "delivered") {
        s.deliveredCount++;
        const created = new Date(order.createdAt).getTime();
        const updated = new Date(order.updatedAt).getTime();
        const days = (updated - created) / (24 * 3600_000);
        s.totalShippingDays += days;
        if (days <= 15) s.onTimeCount++;
        s.qualityScores.push(days <= 10 ? 90 : days <= 15 ? 75 : days <= 20 ? 60 : 40);
      }

      const midpoint = Math.floor(orders.length / 2);
      const idx = orders.indexOf(order);
      if (status === "delivered" || status === "shipped") {
        if (idx < midpoint) {
          s.firstHalfTotal++;
          const created = new Date(order.createdAt).getTime();
          const updated = new Date(order.updatedAt).getTime();
          if ((updated - created) / (24 * 3600_000) <= 15) s.firstHalfOnTime++;
        } else {
          s.secondHalfTotal++;
          const created = new Date(order.createdAt).getTime();
          const updated = new Date(order.updatedAt).getTime();
          if ((updated - created) / (24 * 3600_000) <= 15) s.secondHalfOnTime++;
        }
      }
    }

    const suppliers: SupplierPerformanceData["suppliers"] = [];

    for (const s of supplierMap.values()) {
      const avgShippingDays = s.shippedCount > 0 ? Math.round((s.totalShippingDays / s.shippedCount) * 10) / 10 : 0;
      const onTimeRate = s.shippedCount > 0 ? Math.round((s.onTimeCount / s.shippedCount) * 100) : 100;
      const returnRate = s.orderCount > 0 ? Math.round((s.cancelledCount / s.orderCount) * 100) : 0;
      const avgQualityScore =
        s.qualityScores.length > 0
          ? Math.round(s.qualityScores.reduce((a, b) => a + b, 0) / s.qualityScores.length)
          : 75;
      const avgMargin = s.totalRevenue > 0 ? Math.round(((s.totalRevenue - s.totalCost) / s.totalRevenue) * 100) : 0;

      const firstHalfRate = s.firstHalfTotal > 0 ? s.firstHalfOnTime / s.firstHalfTotal : 1;
      const secondHalfRate = s.secondHalfTotal > 0 ? s.secondHalfOnTime / s.secondHalfTotal : 1;
      let reliabilityTrend: "improving" | "stable" | "declining" = "stable";
      if (secondHalfRate - firstHalfRate > 0.1) reliabilityTrend = "improving";
      else if (firstHalfRate - secondHalfRate > 0.1) reliabilityTrend = "declining";

      let status: "excellent" | "good" | "warning" | "poor" = "good";
      if (onTimeRate >= 90 && avgQualityScore >= 85) status = "excellent";
      else if (onTimeRate >= 75 && avgQualityScore >= 70) status = "good";
      else if (onTimeRate >= 50 || avgQualityScore >= 50) status = "warning";
      else status = "poor";

      suppliers.push({
        supplierId: s.supplierId,
        supplierName: s.supplierName,
        orderCount: s.orderCount,
        avgShippingDays,
        onTimeRate,
        returnRate,
        avgQualityScore,
        totalRevenue: Math.round(s.totalRevenue * 100) / 100,
        totalProfit: Math.round((s.totalRevenue - s.totalCost) * 100) / 100,
        avgMargin,
        reliabilityTrend,
        status,
      });
    }

    suppliers.sort((a, b) => b.onTimeRate - a.onTimeRate);

    const summary: SupplierPerformanceData["summary"] = {
      totalSuppliers: suppliers.length,
      bestPerformer: suppliers[0]?.supplierName || "N/A",
      worstPerformer: suppliers[suppliers.length - 1]?.supplierName || "N/A",
      avgOverallScore:
        suppliers.length > 0
          ? Math.round(suppliers.reduce((a, s) => a + s.avgQualityScore, 0) / suppliers.length)
          : 0,
    };

    return NextResponse.json({ suppliers, summary });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch supplier performance", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DASHBOARDS);

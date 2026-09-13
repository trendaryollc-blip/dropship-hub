import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import type { InventoryDashboardData } from "@/types/fulfillment";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();

    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("fulfillmentOrders")
      .where("createdAt", ">=", thirtyDaysAgo)
      .get();

    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
      id: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      totalRevenue?: number;
      items?: Array<{ productId: string; name: string; quantity: number; unitCost: number; supplierName: string; price: number }>;
    }>;

    const productMap = new Map<
      string,
      { name: string; supplierName: string; totalSold: number; revenue: number; unitCost: number; lastUpdated: string }
    >();

    let totalInventoryValue = 0;

    for (const order of orders) {
      if (!order.items) continue;
      for (const item of order.items) {
        const key = item.productId;
        if (!productMap.has(key)) {
          productMap.set(key, {
            name: item.name,
            supplierName: item.supplierName,
            totalSold: 0,
            revenue: 0,
            unitCost: item.unitCost,
            lastUpdated: order.updatedAt,
          });
        }
        const p = productMap.get(key)!;
        p.totalSold += item.quantity;
        p.revenue += item.price * item.quantity;
        totalInventoryValue += item.unitCost * item.quantity;
        if (order.updatedAt > p.lastUpdated) p.lastUpdated = order.updatedAt;
      }
    }

    const totalSKUs = productMap.size;
    const avgStockLevel = totalSKUs > 0 ? Math.round((orders.length / totalSKUs) * 10) / 10 : 0;

    const alerts: InventoryDashboardData["alerts"] = [];
    const topProducts: InventoryDashboardData["topProducts"] = [];

    for (const [productId, data] of productMap.entries()) {
      const avgDailyDemand = data.totalSold / 30;
      const currentStock = Math.max(0, data.totalSold);
      const reorderPoint = 5;
      const daysOfStock = avgDailyDemand > 0 ? Math.round(currentStock / avgDailyDemand) : 999;

      let severity: "out_of_stock" | "critical" | "low" = "low";
      if (currentStock <= 0) severity = "out_of_stock";
      else if (currentStock < reorderPoint / 2) severity = "critical";
      else if (currentStock < reorderPoint) severity = "low";

      let status: "healthy" | "low" | "critical" | "stockout" = "healthy";
      if (daysOfStock <= 0) status = "stockout";
      else if (daysOfStock <= 3) status = "critical";
      else if (daysOfStock <= 7) status = "low";

      if (currentStock < reorderPoint) {
        alerts.push({
          productId,
          productName: data.name,
          supplierName: data.supplierName,
          currentStock,
          reorderPoint,
          severity,
          lastUpdated: data.lastUpdated,
        });
      }

      topProducts.push({
        productId,
        productName: data.name,
        totalSold: data.totalSold,
        revenue: Math.round(data.revenue * 100) / 100,
        avgDailyDemand: Math.round(avgDailyDemand * 10) / 10,
        daysOfStock,
        status,
      });
    }

    topProducts.sort((a, b) => b.revenue - a.revenue);

    const lowStockCount = alerts.filter((a) => a.severity === "low").length;
    const outOfStockCount = alerts.filter((a) => a.severity === "out_of_stock").length;

    const summary: InventoryDashboardData["summary"] = {
      totalSKUs,
      lowStockCount,
      outOfStockCount,
      avgStockLevel,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
    };

    return NextResponse.json({ summary, alerts, topProducts: topProducts.slice(0, 20) });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch inventory dashboard", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DASHBOARDS);

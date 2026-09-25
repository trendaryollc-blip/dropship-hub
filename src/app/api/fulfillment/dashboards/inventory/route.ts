import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import type { InventoryDashboardData } from "@/types/fulfillment";
import { safeErrorMessage } from "@/lib/api-errors";

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
    const avgUnitsPerOrder = totalSKUs > 0 ? Math.round((orders.length / totalSKUs) * 10) / 10 : 0;

    const topProducts: InventoryDashboardData["topProducts"] = [];

    for (const [productId, data] of productMap.entries()) {
      const avgDailyDemand = data.totalSold / 30;

      topProducts.push({
        productId,
        productName: data.name,
        totalSold: data.totalSold,
        revenue: Math.round(data.revenue * 100) / 100,
        avgDailyDemand: Math.round(avgDailyDemand * 10) / 10,
      });
    }

    topProducts.sort((a, b) => b.revenue - a.revenue);

    const summary: InventoryDashboardData["summary"] = {
      totalSKUs,
      avgUnitsPerOrder,
      totalCogs30d: Math.round(totalInventoryValue * 100) / 100,
    };

    return NextResponse.json({ summary, topProducts: topProducts.slice(0, 20) });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch inventory dashboard", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.DASHBOARDS);

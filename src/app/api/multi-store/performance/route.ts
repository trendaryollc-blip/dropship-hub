import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getAdminDB } from "@/lib/firebase-admin";
import { safeErrorMessage } from "@/lib/api-errors";
import type { StorePerformance } from "@/types/multi-store";

const PERIOD_DAYS: Record<"7d" | "30d" | "90d", number> = { "7d": 7, "30d": 30, "90d": 90 };

// ─── GET: compute real per-store performance from fulfillmentOrders ─────────
// Previously this read storePerformances docs that nothing ever wrote, so the
// Performance tab and the dashboard KPIs were permanently zero. Performance is
// now computed live from the user's actual orders for the requested window,
// with trend percentages versus the preceding window of the same length.

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "30d") as "7d" | "30d" | "90d";
    const days = PERIOD_DAYS[period] || 30;

    const now = Date.now();
    const currentSince = new Date(now - days * 86400000).toISOString();
    const prevSince = new Date(now - 2 * days * 86400000).toISOString();

    const db = await getAdminDB();

    const [connsSnap, ordersSnap] = await Promise.all([
      db.collection("users").doc(uid).collection("storeConnections").get(),
      db.collection("users").doc(uid).collection("fulfillmentOrders")
        .where("createdAt", ">=", prevSince)
        .get(),
    ]);

    // Group orders by store, split into current vs previous window.
    const byStore = new Map<string, { cur: { orders: number; revenue: number; profit: number; fulfilled: number }; prev: { orders: number; revenue: number; profit: number } }>();
    for (const docSnap of ordersSnap.docs) {
      const o = docSnap.data() as { storeId?: string; totalRevenue?: number; profit?: number; status?: string; createdAt?: string };
      const storeId = (o.storeId as string) || "";
      if (!storeId) continue;
      const bucket = byStore.get(storeId) ?? {
        cur: { orders: 0, revenue: 0, profit: 0, fulfilled: 0 },
        prev: { orders: 0, revenue: 0, profit: 0 },
      };
      const createdAt = typeof o.createdAt === "string" ? o.createdAt : "";
      const isCurrent = createdAt >= currentSince;
      const window = isCurrent ? bucket.cur : bucket.prev;
      window.orders += 1;
      window.revenue += o.totalRevenue || 0;
      window.profit += o.profit || 0;
      if (isCurrent && (o.status === "shipped" || o.status === "delivered")) bucket.cur.fulfilled += 1;
      byStore.set(storeId, bucket);
    }

    const performances: StorePerformance[] = [];
    for (const conn of connsSnap.docs) {
      const connData = conn.data() as { name?: string; platform?: string };
      const bucket = byStore.get(conn.id);
      if (!bucket) continue; // stores with no orders in either window stay out

      const { cur, prev } = bucket;
      const trendPct = (current: number, previous: number): number =>
        previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;

      performances.push({
        storeId: conn.id,
        storeName: connData.name || conn.id,
        storePlatform: connData.platform || "",
        metrics: {
          totalOrders: cur.orders,
          totalRevenue: Math.round(cur.revenue * 100) / 100,
          totalProfit: Math.round(cur.profit * 100) / 100,
          avgOrderValue: cur.orders > 0 ? Math.round((cur.revenue / cur.orders) * 100) / 100 : 0,
          // Not measurable from order data alone — honest zeros until store
          // analytics provide traffic/refund/shipping signals.
          conversionRate: 0,
          returnRate: 0,
          fulfillmentRate: cur.orders > 0 ? Math.round((cur.fulfilled / cur.orders) * 100) : 0,
          avgShippingDays: 0,
        },
        trends: {
          ordersTrend: trendPct(cur.orders, prev.orders),
          revenueTrend: trendPct(cur.revenue, prev.revenue),
          profitTrend: trendPct(cur.profit, prev.profit),
        },
        period,
      });
    }

    performances.sort((a, b) => b.metrics.totalRevenue - a.metrics.totalRevenue);
    return NextResponse.json({ performances });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch store performances", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { storeId, storeName, storePlatform, metrics, trends, period } = body;

    if (!storeId || !storeName || !metrics) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("storePerformances")
      .doc(`${storeId}_${period || "30d"}`)
      .set({
        storeId,
        storeName,
        storePlatform: storePlatform || "",
        metrics,
        trends: trends || { ordersTrend: 0, revenueTrend: 0, profitTrend: 0 },
        period: period || "30d",
        updatedAt: new Date().toISOString(),
      }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save store performance", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

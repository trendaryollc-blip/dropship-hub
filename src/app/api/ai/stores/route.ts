import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";
import { safeNum, safeStr } from "@/lib/utils-helpers";

interface StorePerformance {
  id: string;
  platform: string;
  name: string;
  status: string;
  productsLive: number;
  productsError: number;
  totalPushed: number;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  conversionRate: number;
  healthScore: number;
  healthLabel: string;
  issues: string[];
}

interface MultiStoreResult {
  stores: StorePerformance[];
  comparison: {
    bestStore: string;
    worstStore: string;
    avgRevenue: number;
    avgOrders: number;
    revenueDifference: number;
  };
  insights: string[];
  generatedAt: string;
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    // Fetch store connections and pushed products
    const [storeSnap, pushedSnap, revenueSnap] = await Promise.all([
      userRef.collection("storeConnections").get(),
      userRef.collection("pushedProducts").orderBy("pushedAt", "desc").limit(100).get(),
      userRef.collection("revenue").orderBy("createdAt", "desc").limit(60).get(),
    ]);

    const stores = storeSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentData));
    const pushed = pushedSnap.docs.map((d) => d.data() as DocumentData);
    const revenue = revenueSnap.docs.map((d) => d.data() as DocumentData);

    if (stores.length === 0) {
      return NextResponse.json({
        stores: [],
        comparison: { bestStore: "N/A", worstStore: "N/A", avgRevenue: 0, avgOrders: 0, revenueDifference: 0 },
        insights: ["No stores connected. Connect your first store to start tracking performance."],
        generatedAt: new Date().toISOString(),
      });
    }

    // Analyze each store
    const storePerformances: StorePerformance[] = stores.map((store) => {
      const storeId = store.id;
      const storeName = safeStr(store.name, "Unknown Store");
      const platform = safeStr(store.platform, "Unknown");
      const status = safeStr(store.status, "unknown");

      const storeProducts = pushed.filter((p) => safeStr(p.storeId) === storeId);
      const liveProducts = storeProducts.filter((p) => safeStr(p.status) === "live").length;
      const errorProducts = storeProducts.filter((p) => safeStr(p.status) === "error").length;

      // Estimate revenue for this store (in production, would use platform API)
      const estimatedRevenue = revenue.reduce((s, r) => {
        const platformMatch = safeStr(r.platform).toLowerCase().includes(platform.toLowerCase());
        return s + (platformMatch ? safeNum(r.amount) : 0);
      }, 0);

      const estimatedOrders = revenue.reduce((s, r) => {
        const platformMatch = safeStr(r.platform).toLowerCase().includes(platform.toLowerCase());
        return s + (platformMatch ? safeNum(r.orders) : 0);
      }, 0);

      const avgOrderValue = estimatedOrders > 0 ? +(estimatedRevenue / estimatedOrders).toFixed(2) : 0;

      // Compute health score
      let healthScore = 50;
      const issues: string[] = [];

      if (status === "connected") healthScore += 20;
      else { healthScore -= 20; issues.push("Store disconnected"); }

      if (liveProducts > 0) healthScore += 15;
      else if (storeProducts.length > 0) { issues.push("No live products"); }

      if (errorProducts === 0) healthScore += 10;
      else { healthScore -= errorProducts * 3; issues.push(`${errorProducts} products with errors`); }

      if (estimatedRevenue > 0) healthScore += 10;

      healthScore = Math.max(0, Math.min(100, healthScore));

      let healthLabel = "Critical";
      if (healthScore >= 80) healthLabel = "Excellent";
      else if (healthScore >= 60) healthLabel = "Good";
      else if (healthScore >= 40) healthLabel = "Fair";

      return {
        id: storeId,
        platform,
        name: storeName,
        status,
        productsLive: liveProducts,
        productsError: errorProducts,
        totalPushed: storeProducts.length,
        revenue: +estimatedRevenue.toFixed(2),
        orders: estimatedOrders,
        avgOrderValue,
        conversionRate: storeProducts.length > 0 ? +((liveProducts / storeProducts.length) * 100).toFixed(1) : 0,
        healthScore,
        healthLabel,
        issues,
      };
    });

    storePerformances.sort((a, b) => b.healthScore - a.healthScore);

    // Comparison
    const bestStore = storePerformances[0]?.name || "N/A";
    const worstStore = storePerformances[storePerformances.length - 1]?.name || "N/A";
    const avgRevenue = storePerformances.length > 0
      ? +(storePerformances.reduce((s, st) => s + st.revenue, 0) / storePerformances.length).toFixed(2)
      : 0;
    const avgOrders = storePerformances.length > 0
      ? Math.round(storePerformances.reduce((s, st) => s + st.orders, 0) / storePerformances.length)
      : 0;
    const revenueDifference = storePerformances.length >= 2
      ? +(storePerformances[0].revenue - storePerformances[storePerformances.length - 1].revenue).toFixed(2)
      : 0;

    // Insights
    const insights: string[] = [];
    if (storePerformances.length === 1) {
      insights.push("You have one store connected. Consider adding another platform to diversify.");
    } else if (revenueDifference > avgRevenue * 0.3) {
      insights.push(`${bestStore} outperforms ${worstStore} by $${revenueDifference} — investigate what's working there.`);
    }

    const totalErrors = storePerformances.reduce((s, st) => s + st.productsError, 0);
    if (totalErrors > 0) {
      insights.push(`${totalErrors} product push error${totalErrors > 1 ? "s" : ""} across all stores — fix these to avoid lost sales.`);
    }

    const disconnected = storePerformances.filter((s) => s.status !== "connected");
    if (disconnected.length > 0) {
      insights.push(`${disconnected.length} store${disconnected.length > 1 ? "s" : ""} disconnected — reconnect to resume operations.`);
    }

    if (insights.length === 0) {
      insights.push("All stores are performing well. Keep monitoring and optimizing.");
    }

    return NextResponse.json({
      stores: storePerformances,
      comparison: { bestStore, worstStore, avgRevenue, avgOrders, revenueDifference },
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to compare stores", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

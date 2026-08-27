import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { DocumentData } from "firebase-admin/firestore";

export interface BusinessContext {
  revenue: {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    trend: "up" | "down" | "stable";
    profitMargin: number;
    totalOrders: number;
    avgOrderValue: number;
  };
  products: {
    totalTracked: number;
    byStage: {
      discovery: number;
      testing: number;
      winning: number;
      scaling: number;
      saturation: number;
      sunset: number;
    };
    topPerformers: { title: string; profit: number; trend: string; stage: string }[];
    underPerformers: { title: string; profit: number; issue: string }[];
    recentAlerts: { title: string; severity: string; description: string }[];
  };
  suppliers: {
    totalActive: number;
    avgReliability: number;
    criticalAlerts: { supplierName: string; title: string; severity: string; description: string }[];
    topSupplier: string;
    worstSupplier: string;
    avgShippingDays: number;
    avgRefundRate: number;
  };
  orders: {
    pendingRouting: number;
    totalRouted: number;
    avgShippingDays: number;
    avgCost: number;
    recentDecisions: { productTitle: string; selectedSupplier: string; shippingDays: number; status: string }[];
  };
  customerService: {
    activeConversations: number;
    escalatedQueue: number;
    avgConfidence: number;
    resolutionRate: number;
    aiHandledPercent: number;
    totalHandled: number;
    recentEscalations: { customerName: string; reason: string; subject: string }[];
  };
  alerts: {
    unread: number;
    critical: { title: string; description: string; type: string }[];
    opportunities: { title: string; description: string }[];
    risks: { title: string; description: string }[];
    warnings: { title: string; description: string }[];
  };
  store: {
    connected: number;
    total: number;
    productsLive: number;
    productsErrored: number;
    platforms: string[];
  };
  missions: {
    completedToday: number;
    totalToday: number;
  };
  competitors: {
    recentlyAnalyzed: number;
    topQueries: string[];
  };
  digest: {
    hasLatest: boolean;
    lastDate: string;
    lastRevenue: number;
    lastOrders: number;
  };
  healthScore: {
    overall: number;
    financial: number;
    products: number;
    suppliers: number;
    customerService: number;
    operations: number;
  };
  lastUpdated: string;
  dataFreshness: "real-time" | "recent" | "stale";
}

function safeNum(val: unknown, fallback = 0): number {
  return typeof val === "number" ? val : fallback;
}

function safeStr(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

type HealthInput = Omit<BusinessContext, "lastUpdated" | "dataFreshness" | "healthScore">;

function computeHealthScore(ctx: HealthInput): BusinessContext["healthScore"] {
  let financial = 0;
  let products = 0;
  let suppliers = 0;
  let customerService = 0;
  let operations = 0;

  // Financial (30 points)
  if (ctx.revenue.profitMargin >= 30) financial += 15;
  else if (ctx.revenue.profitMargin >= 20) financial += 10;
  else if (ctx.revenue.profitMargin >= 10) financial += 5;

  if (ctx.revenue.trend === "up") financial += 10;
  else if (ctx.revenue.trend === "stable") financial += 5;

  if (ctx.revenue.today > 0) financial += 5;

  // Products (20 points)
  const activeProducts = ctx.products.byStage.winning + ctx.products.byStage.scaling;
  if (activeProducts >= 3) products += 10;
  else if (activeProducts >= 1) products += 5;

  if (ctx.products.byStage.saturation > 2) products -= 5;
  if (ctx.products.recentAlerts.filter((a) => a.severity === "critical").length === 0) products += 5;
  if (ctx.products.topPerformers.length > 0) products += 5;

  // Suppliers (20 points)
  if (ctx.suppliers.avgReliability >= 80) suppliers += 10;
  else if (ctx.suppliers.avgReliability >= 60) suppliers += 5;

  if (ctx.suppliers.criticalAlerts.length === 0) suppliers += 5;
  if (ctx.suppliers.avgRefundRate <= 0.05) suppliers += 5;
  else if (ctx.suppliers.avgRefundRate <= 0.10) suppliers += 2;

  // Customer Service (15 points)
  if (ctx.customerService.escalatedQueue === 0) customerService += 5;
  else if (ctx.customerService.escalatedQueue <= 2) customerService += 2;

  if (ctx.customerService.resolutionRate >= 80) customerService += 5;
  else if (ctx.customerService.resolutionRate >= 60) customerService += 2;

  if (ctx.customerService.aiHandledPercent >= 70) customerService += 5;

  // Operations (15 points)
  if (ctx.store.connected >= 1) operations += 5;
  if (ctx.store.productsErrored === 0) operations += 3;
  if (ctx.missions.totalToday > 0 && ctx.missions.completedToday === ctx.missions.totalToday) operations += 4;
  if (ctx.alerts.critical.length === 0) operations += 3;

  const overall = Math.max(0, Math.min(100,
    Math.round((financial + products + suppliers + customerService + operations)
  )));

  return {
    overall,
    financial: Math.max(0, Math.min(30, financial)),
    products: Math.max(0, Math.min(20, products)),
    suppliers: Math.max(0, Math.min(20, suppliers)),
    customerService: Math.max(0, Math.min(15, customerService)),
    operations: Math.max(0, Math.min(15, operations)),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    // Fetch ALL collections in parallel
    const [
      revenueSnap,
      lifecycleSnap,
      lifecycleAlertsSnap,
      supplierPerfSnap,
      supplierAlertsSnap,
      routingSnap,
      csConversationsSnap,
      alertsSnap,
      storeSnap,
      pushedProductsSnap,
      missionsSnap,
      competitorSearchesSnap,
      digestSnap,
      profitEntriesSnap,
    ] = await Promise.all([
      userRef.collection("revenue").orderBy("createdAt", "desc").limit(60).get(),
      userRef.collection("productLifecycle").limit(50).get(),
      userRef.collection("lifecycleAlerts").orderBy("createdAt", "desc").limit(20).get(),
      userRef.collection("supplierPerformance").orderBy("createdAt", "desc").limit(30).get(),
      userRef.collection("supplierAlerts").orderBy("createdAt", "desc").limit(20).get(),
      userRef.collection("routingDecisions").orderBy("createdAt", "desc").limit(30).get(),
      userRef.collection("csConversations").orderBy("createdAt", "desc").limit(50).get(),
      userRef.collection("alerts").orderBy("createdAt", "desc").limit(30).get(),
      userRef.collection("storeConnections").get(),
      userRef.collection("pushedProducts").orderBy("pushedAt", "desc").limit(50).get(),
      userRef.collection("missions").orderBy("createdAt", "desc").limit(10).get(),
      userRef.collection("competitorSearches").orderBy("createdAt", "desc").limit(10).get(),
      userRef.collection("digests").orderBy("generatedAt", "desc").limit(1).get(),
      userRef.collection("profitEntries").orderBy("createdAt", "desc").limit(50).get(),
    ]);

    const revenueEntries = revenueSnap.docs.map((d) => d.data() as DocumentData);
    const lifecycleEntries = lifecycleSnap.docs.map((d) => d.data() as DocumentData);
    const lifecycleAlerts = lifecycleAlertsSnap.docs.map((d) => d.data() as DocumentData);
    const supplierPerfs = supplierPerfSnap.docs.map((d) => d.data() as DocumentData);
    const supplierAlerts = supplierAlertsSnap.docs.map((d) => d.data() as DocumentData);
    const routingDecisions = routingSnap.docs.map((d) => d.data() as DocumentData);
    const csConversations = csConversationsSnap.docs.map((d) => d.data() as DocumentData);
    const alerts = alertsSnap.docs.map((d) => d.data() as DocumentData);
    const storeConnections = storeSnap.docs.map((d) => d.data() as DocumentData);
    const pushedProducts = pushedProductsSnap.docs.map((d) => d.data() as DocumentData);
    const missions = missionsSnap.docs.map((d) => d.data() as DocumentData);
    const competitorSearches = competitorSearchesSnap.docs.map((d) => d.data() as DocumentData);
    const digests = digestSnap.docs.map((d) => d.data() as DocumentData);
    const profitEntries = profitEntriesSnap.docs.map((d) => d.data() as DocumentData);

    // ── Revenue ──────────────────────────────────────────
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const todayRevenue = revenueEntries
      .filter((e) => safeStr(e.date) === today)
      .reduce((sum, e) => sum + safeNum(e.amount), 0);
    const yesterdayRevenue = revenueEntries
      .filter((e) => safeStr(e.date) === yesterday)
      .reduce((sum, e) => sum + safeNum(e.amount), 0);
    const weekRevenue = revenueEntries
      .filter((e) => safeStr(e.date) >= weekAgo)
      .reduce((sum, e) => sum + safeNum(e.amount), 0);
    const monthRevenue = revenueEntries
      .filter((e) => safeStr(e.date) >= monthAgo)
      .reduce((sum, e) => sum + safeNum(e.amount), 0);

    const todayOrders = revenueEntries
      .filter((e) => safeStr(e.date) === today)
      .reduce((sum, e) => sum + safeNum(e.orders), 0);

    const totalRevenue = revenueEntries.reduce((sum, e) => sum + safeNum(e.amount), 0);
    const totalProfit = revenueEntries.reduce((sum, e) => sum + safeNum(e.profit), 0);
    const profitMargin = totalRevenue > 0 ? +((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

    // Profit entries for detailed analysis
    const totalProfitFromEntries = profitEntries.reduce((sum, e) => sum + safeNum(e.netProfit), 0);
    const totalRevenueFromEntries = profitEntries.reduce((sum, e) => sum + safeNum(e.revenue), 0);
    const effectiveMargin = totalRevenueFromEntries > 0
      ? +((totalProfitFromEntries / totalRevenueFromEntries) * 100).toFixed(1)
      : profitMargin;

    let trend: "up" | "down" | "stable" = "stable";
    if (yesterdayRevenue > 0) {
      const change = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
      if (change > 5) trend = "up";
      else if (change < -5) trend = "down";
    } else if (todayRevenue > 0) {
      trend = "up";
    }

    const avgOrderValue = todayOrders > 0 ? +(todayRevenue / todayOrders).toFixed(2) : 0;

    // ── Products ─────────────────────────────────────────
    const byStage = {
      discovery: 0,
      testing: 0,
      winning: 0,
      scaling: 0,
      saturation: 0,
      sunset: 0,
    };
    lifecycleEntries.forEach((p) => {
      const stage = safeStr(p.currentStage) as keyof typeof byStage;
      if (stage in byStage) byStage[stage]++;
    });

    // Sort profit entries to find top/under performers
    const productProfitMap = new Map<string, { revenue: number; profit: number; orders: number }>();
    profitEntries.forEach((e) => {
      const title = safeStr(e.productTitle, "Unknown");
      const existing = productProfitMap.get(title) || { revenue: 0, profit: 0, orders: 0 };
      existing.revenue += safeNum(e.revenue);
      existing.profit += safeNum(e.netProfit);
      existing.orders += 1;
      productProfitMap.set(title, existing);
    });

    const productProfits = Array.from(productProfitMap.entries())
      .map(([title, data]) => ({
        title,
        profit: +data.profit.toFixed(2),
        revenue: +data.revenue.toFixed(2),
        orders: data.orders,
        margin: data.revenue > 0 ? +((data.profit / data.revenue) * 100).toFixed(1) : 0,
        stage: lifecycleEntries.find((l) => safeStr(l.productTitle) === title)?.currentStage || "unknown",
      }))
      .sort((a, b) => b.profit - a.profit);

    const topPerformers = productProfits
      .filter((p) => p.profit > 0)
      .slice(0, 5)
      .map((p) => ({
        title: p.title,
        profit: p.profit,
        trend: p.margin >= 30 ? "strong" : p.margin >= 20 ? "healthy" : "thin",
        stage: p.stage,
      }));

    const underPerformers = productProfits
      .filter((p) => p.profit <= 0 || p.margin < 10)
      .slice(0, 5)
      .map((p) => ({
        title: p.title,
        profit: p.profit,
        issue: p.profit < 0 ? "losing money" : p.margin < 10 ? "thin margins" : "break-even",
      }));

    const recentProductAlerts = lifecycleAlerts.slice(0, 5).map((a) => ({
      title: safeStr(a.title),
      severity: safeStr(a.severity, "info"),
      description: safeStr(a.description),
    }));

    // ── Suppliers ────────────────────────────────────────
    const supplierMap = new Map<string, { name: string; reliability: number; refundRate: number; shippingDays: number }>();
    supplierPerfs.forEach((s) => {
      const id = safeStr(s.supplierId);
      if (!id) return;
      const existing = supplierMap.get(id) || {
        name: safeStr(s.supplierName, id),
        reliability: 0,
        refundRate: 0,
        shippingDays: 0,
      };
      existing.reliability = safeNum(s.reliabilityScore);
      existing.refundRate = safeNum(s.refundRate);
      existing.shippingDays = safeNum(s.avgShippingDays);
      supplierMap.set(id, existing);
    });

    const supplierList = Array.from(supplierMap.values());
    const avgReliability = supplierList.length > 0
      ? +(supplierList.reduce((s, sup) => s + sup.reliability, 0) / supplierList.length).toFixed(1)
      : 0;
    const avgRefundRate = supplierList.length > 0
      ? +(supplierList.reduce((s, sup) => s + sup.refundRate, 0) / supplierList.length).toFixed(4)
      : 0;
    const avgShippingDays = supplierList.length > 0
      ? +(supplierList.reduce((s, sup) => s + sup.shippingDays, 0) / supplierList.length).toFixed(1)
      : 0;

    const sortedByReliability = [...supplierList].sort((a, b) => b.reliability - a.reliability);
    const topSupplier = sortedByReliability[0]?.name || "None";
    const worstSupplier = sortedByReliability[sortedByReliability.length - 1]?.name || "None";

    const criticalSupplierAlerts = supplierAlerts
      .filter((a) => safeStr(a.severity) === "high")
      .slice(0, 5)
      .map((a) => ({
        supplierName: safeStr(a.supplierName),
        title: safeStr(a.title),
        severity: safeStr(a.severity),
        description: safeStr(a.description),
      }));

    // ── Orders & Routing ─────────────────────────────────
    const pendingRouting = routingDecisions.filter((d) => safeStr(d.status) === "pending").length;
    const totalRouted = routingDecisions.length;
    const avgRoutingDays = totalRouted > 0
      ? +(routingDecisions.reduce((s, d) => s + safeNum(d.shippingDays), 0) / totalRouted).toFixed(1)
      : 0;
    const avgRoutingCost = totalRouted > 0
      ? +(routingDecisions.reduce((s, d) => s + safeNum(d.totalCost), 0) / totalRouted).toFixed(2)
      : 0;

    const recentDecisions = routingDecisions.slice(0, 5).map((d) => ({
      productTitle: safeStr(d.productTitle),
      selectedSupplier: safeStr(d.selectedSupplier),
      shippingDays: safeNum(d.shippingDays),
      status: safeStr(d.status),
    }));

    // ── Customer Service ─────────────────────────────────
    const activeConversations = csConversations.filter((c) => safeStr(c.status) === "active").length;
    const escalatedQueue = csConversations.filter((c) => safeStr(c.status) === "escalated").length;
    const resolvedCount = csConversations.filter((c) => safeStr(c.status) === "resolved").length;
    const totalCS = csConversations.length;
    const aiHandledCount = csConversations.filter((c) => c.aiHandled === true).length;

    const recentEscalations = csConversations
      .filter((c) => safeStr(c.status) === "escalated")
      .slice(0, 5)
      .map((c) => ({
        customerName: safeStr(c.customerName),
        reason: safeStr(c.lastMessage, "No reason provided"),
        subject: safeStr(c.subject),
      }));

    // ── Alerts ───────────────────────────────────────────
    const unreadAlerts = alerts.filter((a) => a.read !== true);
    const criticalAlerts = alerts
      .filter((a) => safeStr(a.type) === "warning" || safeStr(a.type) === "risk")
      .slice(0, 5)
      .map((a) => ({
        title: safeStr(a.title),
        description: safeStr(a.description),
        type: safeStr(a.type),
      }));
    const opportunityAlerts = alerts
      .filter((a) => safeStr(a.type) === "opportunity")
      .slice(0, 5)
      .map((a) => ({ title: safeStr(a.title), description: safeStr(a.description) }));
    const riskAlerts = alerts
      .filter((a) => safeStr(a.type) === "risk")
      .slice(0, 5)
      .map((a) => ({ title: safeStr(a.title), description: safeStr(a.description) }));
    const warningAlerts = alerts
      .filter((a) => safeStr(a.type) === "warning")
      .slice(0, 5)
      .map((a) => ({ title: safeStr(a.title), description: safeStr(a.description) }));

    // ── Store ────────────────────────────────────────────
    const connectedStores = storeConnections.filter((c) => safeStr(c.status) === "connected").length;
    const erroredProducts = pushedProducts.filter((p) => safeStr(p.status) === "error").length;
    const liveProducts = pushedProducts.filter((p) => safeStr(p.status) === "live").length;
    const platforms = [...new Set(storeConnections.map((c) => safeStr(c.platform)).filter(Boolean))];

    // ── Missions ─────────────────────────────────────────
    const todayMissions = missions.filter((m) => safeStr(m.date) === today);
    const completedMissions = todayMissions.filter((m) => m.done === true).length;

    // ── Competitors ──────────────────────────────────────
    const topQueries = competitorSearches.slice(0, 5).map((c) => safeStr(c.query));

    // ── Digest ───────────────────────────────────────────
    const latestDigest = digests[0] || null;

    // ── Health Score ─────────────────────────────────────
    const ctxForHealth = {
      revenue: {
        today: todayRevenue,
        yesterday: yesterdayRevenue,
        thisWeek: weekRevenue,
        thisMonth: monthRevenue,
        trend,
        profitMargin: effectiveMargin,
        totalOrders: todayOrders,
        avgOrderValue,
      },
      products: {
        totalTracked: lifecycleEntries.length,
        byStage,
        topPerformers,
        underPerformers,
        recentAlerts: recentProductAlerts,
      },
      suppliers: {
        totalActive: supplierList.length,
        avgReliability,
        criticalAlerts: criticalSupplierAlerts,
        topSupplier,
        worstSupplier,
        avgShippingDays,
        avgRefundRate,
      },
      orders: {
        pendingRouting,
        totalRouted,
        avgShippingDays: avgRoutingDays,
        avgCost: avgRoutingCost,
        recentDecisions,
      },
      customerService: {
        activeConversations,
        escalatedQueue,
        avgConfidence: 0,
        resolutionRate: totalCS > 0 ? +((resolvedCount / totalCS) * 100).toFixed(1) : 0,
        aiHandledPercent: totalCS > 0 ? +((aiHandledCount / totalCS) * 100).toFixed(0) : 0,
        totalHandled: totalCS,
        recentEscalations,
      },
      alerts: {
        unread: unreadAlerts.length,
        critical: criticalAlerts,
        opportunities: opportunityAlerts,
        risks: riskAlerts,
        warnings: warningAlerts,
      },
      store: {
        connected: connectedStores,
        total: storeConnections.length,
        productsLive: liveProducts,
        productsErrored: erroredProducts,
        platforms,
      },
      missions: {
        completedToday: completedMissions,
        totalToday: todayMissions.length,
      },
      competitors: {
        recentlyAnalyzed: competitorSearches.length,
        topQueries,
      },
      digest: {
        hasLatest: latestDigest !== null,
        lastDate: safeStr(latestDigest?.date),
        lastRevenue: safeNum(latestDigest?.metrics?.revenue),
        lastOrders: safeNum(latestDigest?.metrics?.orders),
      },
    };

    const healthScore = computeHealthScore(ctxForHealth);

    const context: BusinessContext = {
      ...ctxForHealth,
      healthScore,
      lastUpdated: new Date().toISOString(),
      dataFreshness: revenueEntries.length > 0 ? "real-time" : "stale",
    };

    return NextResponse.json(context);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to build context", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { DocumentData } from "firebase-admin/firestore";

interface ReportSection {
  title: string;
  content: string;
  metric?: string;
  trend?: "up" | "down" | "stable";
  icon: string;
}

interface BusinessReport {
  period: "weekly" | "monthly";
  dateRange: { start: string; end: string };
  generatedAt: string;
  summary: string;
  sections: ReportSection[];
  healthScore: number;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

function safeNum(val: unknown, fallback = 0): number {
  return typeof val === "number" ? val : fallback;
}

function safeStr(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, period = "weekly" } = body;

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    const daysBack = period === "weekly" ? 7 : 30;
    const startDate = new Date(Date.now() - daysBack * 86400000).toISOString().split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    // Fetch all data for the period
    const [
      revenueSnap,
      productsSnap,
      supplierPerfSnap,
      supplierAlertsSnap,
      csSnap,
      alertsSnap,
      routingSnap,
      profitSnap,
    ] = await Promise.all([
      userRef.collection("revenue").orderBy("createdAt", "desc").limit(60).get(),
      userRef.collection("productLifecycle").limit(50).get(),
      userRef.collection("supplierPerformance").orderBy("createdAt", "desc").limit(30).get(),
      userRef.collection("supplierAlerts").orderBy("createdAt", "desc").limit(20).get(),
      userRef.collection("csConversations").limit(50).get(),
      userRef.collection("alerts").orderBy("createdAt", "desc").limit(30).get(),
      userRef.collection("routingDecisions").orderBy("createdAt", "desc").limit(50).get(),
      userRef.collection("profitEntries").orderBy("createdAt", "desc").limit(60).get(),
    ]);

    const revenue = revenueSnap.docs.map((d) => d.data() as DocumentData);
    const products = productsSnap.docs.map((d) => d.data() as DocumentData);
    const supplierPerfs = supplierPerfSnap.docs.map((d) => d.data() as DocumentData);
    const supplierAlerts = supplierAlertsSnap.docs.map((d) => d.data() as DocumentData);
    const csConversations = csSnap.docs.map((d) => d.data() as DocumentData);
    const alerts = alertsSnap.docs.map((d) => d.data() as DocumentData);
    const routingDecisions = routingSnap.docs.map((d) => d.data() as DocumentData);
    const profitEntries = profitSnap.docs.map((d) => d.data() as DocumentData);

    // Compute period metrics
    const periodRevenue = revenue
      .filter((e) => safeStr(e.date) >= startDate)
      .reduce((s, e) => s + safeNum(e.amount), 0);

    const prevStart = new Date(Date.now() - daysBack * 2 * 86400000).toISOString().split("T")[0];
    const prevRevenue = revenue
      .filter((e) => safeStr(e.date) >= prevStart && safeStr(e.date) < startDate)
      .reduce((s, e) => s + safeNum(e.amount), 0);

    const revenueChange = prevRevenue > 0 ? ((periodRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const periodProfit = profitEntries
      .filter((e) => safeStr(e.date) >= startDate)
      .reduce((s, e) => s + safeNum(e.netProfit), 0);

    const totalRevenueFromProfit = profitEntries
      .filter((e) => safeStr(e.date) >= startDate)
      .reduce((s, e) => s + safeNum(e.revenue), 0);

    const profitMargin = totalRevenueFromProfit > 0
      ? +((periodProfit / totalRevenueFromProfit) * 100).toFixed(1)
      : 0;

    const totalOrders = revenue
      .filter((e) => safeStr(e.date) >= startDate)
      .reduce((s, e) => s + safeNum(e.orders), 0);

    // Product analysis
    const stageCounts = { discovery: 0, testing: 0, winning: 0, scaling: 0, saturation: 0, sunset: 0 };
    products.forEach((p) => {
      const stage = safeStr(p.currentStage) as keyof typeof stageCounts;
      if (stage in stageCounts) stageCounts[stage]++;
    });

    // Supplier analysis
    const avgReliability = supplierPerfs.length > 0
      ? +(supplierPerfs.reduce((s, p) => s + safeNum(p.reliabilityScore), 0) / supplierPerfs.length).toFixed(1)
      : 0;

    const avgRefundRate = supplierPerfs.length > 0
      ? +(supplierPerfs.reduce((s, p) => s + safeNum(p.refundRate), 0) / supplierPerfs.length * 100).toFixed(1)
      : 0;

    // CS analysis
    const totalCS = csConversations.length;
    const resolvedCS = csConversations.filter((c) => safeStr(c.status) === "resolved").length;
    const escalatedCS = csConversations.filter((c) => safeStr(c.status) === "escalated").length;
    const resolutionRate = totalCS > 0 ? +((resolvedCS / totalCS) * 100).toFixed(0) : 0;

    // Routing analysis
    const totalRouted = routingDecisions.length;
    const avgShippingDays = totalRouted > 0
      ? +(routingDecisions.reduce((s, d) => s + safeNum(d.shippingDays), 0) / totalRouted).toFixed(1)
      : 0;

    // Alerts summary
    const criticalAlerts = alerts.filter((a) => safeStr(a.type) === "warning" || safeStr(a.type) === "risk").length;
    const opportunities = alerts.filter((a) => safeStr(a.type) === "opportunity").length;

    // Health score (simplified)
    let healthScore = 50;
    if (profitMargin >= 20) healthScore += 15;
    else if (profitMargin >= 10) healthScore += 5;
    if (revenueChange > 0) healthScore += 10;
    if (avgReliability >= 70) healthScore += 10;
    if (resolutionRate >= 70) healthScore += 10;
    if (criticalAlerts === 0) healthScore += 5;
    healthScore = Math.min(100, healthScore);

    // Build report sections
    const sections: ReportSection[] = [
      {
        title: "Revenue Performance",
        content: `${period === "weekly" ? "Weekly" : "Monthly"} revenue: $${periodRevenue.toFixed(2)}. ${revenueChange > 0 ? `Up ${revenueChange.toFixed(1)}%` : revenueChange < 0 ? `Down ${Math.abs(revenueChange).toFixed(1)}%` : "Flat compared to previous period"}. Total orders: ${totalOrders}.`,
        metric: `$${periodRevenue.toFixed(0)}`,
        trend: revenueChange > 0 ? "up" : revenueChange < 0 ? "down" : "stable",
        icon: "revenue",
      },
      {
        title: "Profitability",
        content: `Net profit: $${periodProfit.toFixed(2)} (${profitMargin}% margin). ${profitMargin >= 20 ? "Healthy margins." : profitMargin >= 10 ? "Margins are acceptable but could improve." : "Margins are thin — review pricing and costs."}`,
        metric: `${profitMargin}%`,
        trend: profitMargin >= 20 ? "up" : profitMargin >= 10 ? "stable" : "down",
        icon: "profit",
      },
      {
        title: "Product Portfolio",
        content: `${products.length} products tracked. ${stageCounts.winning + stageCounts.scaling} active winners. ${stageCounts.saturation} in saturation. ${stageCounts.sunset} sunset.`,
        metric: `${stageCounts.winning + stageCounts.scaling} winners`,
        trend: stageCounts.winning >= 2 ? "up" : "stable",
        icon: "products",
      },
      {
        title: "Supplier Health",
        content: `${supplierPerfs.length} suppliers monitored. Average reliability: ${avgReliability}%. Refund rate: ${avgRefundRate}%. ${supplierAlerts.filter((a) => safeStr(a.severity) === "high").length} critical alerts.`,
        metric: `${avgReliability}%`,
        trend: avgReliability >= 70 ? "up" : "down",
        icon: "suppliers",
      },
      {
        title: "Customer Service",
        content: `${totalCS} conversations. ${resolutionRate}% resolution rate. ${escalatedCS} currently escalated. ${resolutionRate >= 70 ? "Good performance." : "Needs improvement."}`,
        metric: `${resolutionRate}%`,
        trend: resolutionRate >= 70 ? "up" : "down",
        icon: "cs",
      },
      {
        title: "Order Fulfillment",
        content: `${totalRouted} orders routed. Average shipping: ${avgShippingDays} days. ${avgShippingDays <= 10 ? "Fast fulfillment." : avgShippingDays <= 15 ? "Acceptable shipping times." : "Consider faster suppliers."}`,
        metric: `${avgShippingDays}d avg`,
        trend: avgShippingDays <= 10 ? "up" : "down",
        icon: "orders",
      },
    ];

    // Highlights
    const highlights: string[] = [];
    if (revenueChange > 10) highlights.push(`Revenue grew ${revenueChange.toFixed(1)}% vs previous period`);
    if (profitMargin >= 25) highlights.push(`Strong profit margin at ${profitMargin}%`);
    if (stageCounts.winning >= 2) highlights.push(`${stageCounts.winning} winning products in portfolio`);
    if (resolutionRate >= 80) highlights.push(`Excellent CS resolution rate at ${resolutionRate}%`);
    if (avgReliability >= 80) highlights.push(`High supplier reliability at ${avgReliability}%`);

    // Concerns
    const concerns: string[] = [];
    if (revenueChange < -10) concerns.push(`Revenue dropped ${Math.abs(revenueChange).toFixed(1)}% — investigate causes`);
    if (profitMargin < 15) concerns.push(`Profit margin at ${profitMargin}% — review pricing strategy`);
    if (stageCounts.saturation >= 2) concerns.push(`${stageCounts.saturation} products in saturation — diversify`);
    if (escalatedCS > 0) concerns.push(`${escalatedCS} escalated customer conversations`);
    if (criticalAlerts > 0) concerns.push(`${criticalAlerts} unresolved critical alerts`);

    // Recommendations
    const recommendations: string[] = [];
    if (profitMargin < 20) recommendations.push("Review product pricing and negotiate better supplier rates");
    if (stageCounts.saturation > 0) recommendations.push("Research new products to replace saturated ones");
    if (revenueChange < 0) recommendations.push("Analyze top-performing products and double down on what works");
    if (escalatedCS > 0) recommendations.push("Prioritize resolving escalated customer conversations");
    if (products.length < 3) recommendations.push("Expand product research to diversify your catalog");
    if (recommendations.length === 0) recommendations.push("Continue current strategy — your business is healthy");

    const report: BusinessReport = {
      period: period as "weekly" | "monthly",
      dateRange: { start: startDate, end: endDate },
      generatedAt: new Date().toISOString(),
      summary: `${period === "weekly" ? "Weekly" : "Monthly"} report: $${periodRevenue.toFixed(0)} revenue (${revenueChange > 0 ? "+" : ""}${revenueChange.toFixed(1)}%), ${profitMargin}% margin, ${products.length} products tracked, health score ${healthScore}/100.`,
      sections,
      healthScore,
      highlights,
      concerns,
      recommendations,
    };

    // Save report
    await userRef.collection("reports").add({
      ...report,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate report", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";
import { safeNum, safeStr } from "@/lib/utils-helpers";

interface DigestData {
  weeklyRevenue: number;
  weeklyProfit: number;
  weeklyOrders: number;
  topProducts: { name: string; revenue: number; units: number }[];
  topCampaigns: { name: string; roas: number; spend: number }[];
  alerts: { severity: string; text: string }[];
  recommendations: string[];
  goalsProgress: string;
}

function generateEmailHTML(data: DigestData, userName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e0e0e0; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #111118; border-radius: 16px; overflow: hidden; border: 1px solid #1e1e2e; }
  .header { background: linear-gradient(135deg, #6c5ce7, #a855f7); padding: 30px; text-align: center; }
  .header h1 { color: white; font-size: 24px; margin: 0; }
  .header p { color: rgba(255,255,255,0.8); margin: 5px 0 0 0; }
  .section { padding: 20px 30px; border-bottom: 1px solid #1e1e2e; }
  .section-title { font-size: 14px; font-weight: 600; color: #a855f7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
  .metric-row { display: flex; justify-content: space-between; padding: 8px 0; }
  .metric-label { color: #9ca3af; }
  .metric-value { color: white; font-weight: 600; }
  .metric-value.positive { color: #34d399; }
  .metric-value.negative { color: #f87171; }
  .product-item { padding: 10px; background: #1a1a2e; border-radius: 8px; margin-bottom: 8px; }
  .product-name { color: white; font-weight: 500; }
  .product-detail { color: #9ca3af; font-size: 13px; }
  .alert-item { padding: 10px; border-radius: 8px; margin-bottom: 8px; font-size: 13px; }
  .alert-warning { background: #422006; color: #fbbf24; border-left: 3px solid #fbbf24; }
  .alert-critical { background: #450a0a; color: #f87171; border-left: 3px solid #f87171; }
  .recommendation { padding: 10px; background: #0c1a0c; border-radius: 8px; margin-bottom: 8px; color: #34d399; font-size: 13px; border-left: 3px solid #34d399; }
  .footer { padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>DropShip Hub — Weekly Digest</h1>
    <p>${userName}'s Business Report • ${new Date().toLocaleDateString()}</p>
  </div>

  <div class="section">
    <div class="section-title">This Week's Performance</div>
    <div class="metric-row">
      <span class="metric-label">Revenue</span>
      <span class="metric-value positive">$${data.weeklyRevenue.toFixed(2)}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Profit</span>
      <span class="metric-value ${data.weeklyProfit >= 0 ? "positive" : "negative"}">$${data.weeklyProfit.toFixed(2)}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Orders</span>
      <span class="metric-value">${data.weeklyOrders}</span>
    </div>
  </div>

  ${data.topProducts.length > 0 ? `
  <div class="section">
    <div class="section-title">Top Products</div>
    ${data.topProducts.map((p) => `
      <div class="product-item">
        <div class="product-name">${p.name}</div>
        <div class="product-detail">$${p.revenue.toFixed(2)} revenue • ${p.units} units</div>
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${data.topCampaigns.length > 0 ? `
  <div class="section">
    <div class="section-title">Ad Campaign Performance</div>
    ${data.topCampaigns.map((c) => `
      <div class="product-item">
        <div class="product-name">${c.name}</div>
        <div class="product-detail">${c.roas}x ROAS • $${c.spend.toFixed(2)} spent</div>
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${data.alerts.length > 0 ? `
  <div class="section">
    <div class="section-title">Active Alerts</div>
    ${data.alerts.map((a) => `
      <div class="alert-item ${a.severity === "critical" ? "alert-critical" : "alert-warning"}">
        ${a.text}
      </div>
    `).join("")}
  </div>
  ` : ""}

  <div class="section">
    <div class="section-title">AI Recommendations</div>
    ${data.recommendations.map((r) => `
      <div class="recommendation">${r}</div>
    `).join("")}
  </div>

  <div class="footer">
    Powered by DropShip Hub AI • <a href="https://dropshiphub.io" style="color: #a855f7;">Open Dashboard</a>
  </div>
</div>
</body>
</html>
  `;
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    // Fetch data for weekly digest
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();

    const [revenueSnap, profitSnap, alertsSnap, userDoc, productsSnap] = await Promise.all([
      userRef.collection("revenue").where("createdAt", ">=", weekAgoStr).limit(30).get(),
      userRef.collection("profitEntries").where("createdAt", ">=", weekAgoStr).limit(30).get(),
      userRef.collection("alerts").limit(10).get(),
      userRef.get(),
      userRef.collection("productLifecycle").limit(10).get(),
    ]);

    const revenueEntries = revenueSnap.docs.map((d) => d.data() as DocumentData);
    const profitEntries = profitSnap.docs.map((d) => d.data() as DocumentData);
    const alerts = alertsSnap.docs.map((d) => d.data() as DocumentData);
    const userData = userDoc.data() as DocumentData | undefined;
    const products = productsSnap.docs.map((d) => d.data() as DocumentData);

    // Compute weekly metrics
    const weeklyRevenue = revenueEntries.reduce((s, e) => s + safeNum(e.amount), 0);
    const weeklyProfit = profitEntries.reduce((s, e) => s + safeNum(e.netProfit), 0);
    const weeklyOrders = profitEntries.length;

    // Top products
    const productMap = new Map<string, { revenue: number; units: number }>();
    for (const e of profitEntries) {
      const name = safeStr(e.productName, "Unknown");
      const existing = productMap.get(name) || { revenue: 0, units: 0 };
      existing.revenue += safeNum(e.revenue);
      existing.units += 1;
      productMap.set(name, existing);
    }
    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top campaigns
    const campaignMap = new Map<string, { spend: number; revenue: number }>();
    for (const e of profitEntries) {
      const name = safeStr(e.campaignName, "Organic");
      const existing = campaignMap.get(name) || { spend: 0, revenue: 0 };
      existing.spend += safeNum(e.adSpend);
      existing.revenue += safeNum(e.revenue);
      campaignMap.set(name, existing);
    }
    const topCampaigns = Array.from(campaignMap.entries())
      .map(([name, data]) => ({ name, roas: data.spend > 0 ? +(data.revenue / data.spend).toFixed(2) : 0, spend: data.spend }))
      .filter((c) => c.spend > 0)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 3);

    // Alerts
    const alertList = alerts.slice(0, 5).map((a) => ({
      severity: safeStr(a.severity, "warning"),
      text: safeStr(a.text, safeStr(a.description, "Check your dashboard")),
    }));

    // Recommendations
    const recommendations: string[] = [];
    if (weeklyRevenue > 0) {
      const avgOrder = weeklyOrders > 0 ? weeklyRevenue / weeklyOrders : 0;
      recommendations.push(`Your average order value is $${avgOrder.toFixed(2)} — consider upselling or bundling to increase it.`);
    }
    if (topCampaigns.length > 0 && topCampaigns[0].roas > 2) {
      recommendations.push(`Your best campaign "${topCampaigns[0].name}" has a ${topCampaigns[0].roas}x ROAS — scale its budget.`);
    }
    if (products.length < 5) {
      recommendations.push("Add more products to diversify your revenue streams.");
    }
    if (recommendations.length === 0) {
      recommendations.push("Keep building your product catalog and tracking revenue to get personalized insights.");
    }

    const digestData: DigestData = {
      weeklyRevenue,
      weeklyProfit,
      weeklyOrders,
      topProducts,
      topCampaigns,
      alerts: alertList,
      recommendations,
      goalsProgress: "Check your AI Command Center for detailed goal tracking.",
    };

    const userName = safeStr(userData?.displayName, userData?.email?.split("@")[0] || "there");
    const emailHTML = generateEmailHTML(digestData, userName);

    // Save digest to Firestore
    await userRef.collection("digests").add({
      type: "weekly",
      data: digestData,
      emailHTML,
      createdAt: new Date().toISOString(),
      status: "generated",
    });

    return NextResponse.json({
      success: true,
      message: "Weekly digest generated",
      digest: digestData,
      emailHTML,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate digest", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

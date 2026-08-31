import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { ProfitEntrySchema, validateBody } from "@/lib/validation";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "30d";
    const platform = searchParams.get("platform");

    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("profitEntries").orderBy("createdAt", "desc").limit(200).get();

    let orders = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>;

    if (platform && platform !== "all") {
      orders = orders.filter((o) => o.platform === platform);
    }

    const days = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : timeframe === "all" ? 365 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    orders = orders.filter((o) => typeof o.date === "string" && o.date >= cutoffStr);

    let totalRevenue = 0, totalProfit = 0, totalCosts = 0, totalCOGS = 0, totalShipping = 0;
    let totalPlatformFees = 0, totalPaymentProcessing = 0, totalRefunds = 0, totalAdSpend = 0, totalOther = 0;

    for (const o of orders) {
      const revenue = typeof o.revenue === "number" ? o.revenue : 0;
      const netProfit = typeof o.netProfit === "number" ? o.netProfit : 0;
      const cogs = typeof o.cogs === "number" ? o.cogs : 0;
      const shippingCost = typeof o.shippingCost === "number" ? o.shippingCost : 0;
      const platformFee = typeof o.platformFee === "number" ? o.platformFee : 0;
      const paymentProcessing = typeof o.paymentProcessing === "number" ? o.paymentProcessing : 0;
      const refunds = typeof o.refunds === "number" ? o.refunds : 0;
      const adSpend = typeof o.adSpend === "number" ? o.adSpend : 0;
      const otherCosts = typeof o.otherCosts === "number" ? o.otherCosts : 0;

      totalRevenue += revenue;
      totalProfit += netProfit;
      totalCosts += cogs + shippingCost + platformFee + paymentProcessing + refunds + adSpend + otherCosts;
      totalCOGS += cogs;
      totalShipping += shippingCost;
      totalPlatformFees += platformFee;
      totalPaymentProcessing += paymentProcessing;
      totalRefunds += refunds;
      totalAdSpend += adSpend;
      totalOther += otherCosts;
    }

    const refundRate = orders.length > 0 ? +((orders.filter((o) => o.status === "refunded").length / orders.length) * 100).toFixed(1) : 0;
    const avgMargin = totalRevenue > 0 ? +((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

    // Daily breakdown
    const dailyMap = new Map<string, { date: string; revenue: number; profit: number; orders: number; costs: number }>();
    for (const o of orders) {
      const date = typeof o.date === "string" ? o.date : "";
      if (!date) continue;
      const existing = dailyMap.get(date) || { date, revenue: 0, profit: 0, orders: 0, costs: 0 };
      existing.revenue += typeof o.revenue === "number" ? o.revenue : 0;
      existing.profit += typeof o.netProfit === "number" ? o.netProfit : 0;
      existing.orders += 1;
      existing.costs += (typeof o.cogs === "number" ? o.cogs : 0) + (typeof o.shippingCost === "number" ? o.shippingCost : 0) + (typeof o.platformFee === "number" ? o.platformFee : 0) + (typeof o.paymentProcessing === "number" ? o.paymentProcessing : 0) + (typeof o.adSpend === "number" ? o.adSpend : 0) + (typeof o.otherCosts === "number" ? o.otherCosts : 0);
      dailyMap.set(date, existing);
    }
    const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Top products
    const productMap = new Map<string, { productTitle: string; productImage: string; totalRevenue: number; totalProfit: number; totalOrders: number; profitMargin: number; trend: number; status: string }>();
    for (const o of orders) {
      const title = typeof o.productTitle === "string" ? o.productTitle : "Unknown";
      const existing = productMap.get(title) || { productTitle: title, productImage: typeof o.productImage === "string" ? o.productImage : "", totalRevenue: 0, totalProfit: 0, totalOrders: 0, profitMargin: 0, trend: 0, status: "profitable" };
      existing.totalRevenue += typeof o.revenue === "number" ? o.revenue : 0;
      existing.totalProfit += typeof o.netProfit === "number" ? o.netProfit : 0;
      existing.totalOrders += 1;
      productMap.set(title, existing);
    }
    const topProducts = Array.from(productMap.values())
      .map((p) => ({ ...p, profitMargin: p.totalRevenue > 0 ? +((p.totalProfit / p.totalRevenue) * 100).toFixed(1) : 0, status: p.totalProfit > 0 ? "profitable" : p.totalProfit > -10 ? "breakeven" : "losing" }))
      .sort((a, b) => b.totalProfit - a.totalProfit);

    // Cost breakdown
    const total = totalCOGS + totalShipping + totalPlatformFees + totalPaymentProcessing + totalRefunds + totalAdSpend + totalOther || 1;
    const costBreakdown = [
      { name: "COGS", value: +totalCOGS.toFixed(2), pct: +((totalCOGS / total) * 100).toFixed(1), color: "#3b82f6" },
      { name: "Shipping", value: +totalShipping.toFixed(2), pct: +((totalShipping / total) * 100).toFixed(1), color: "#f97316" },
      { name: "Platform Fees", value: +totalPlatformFees.toFixed(2), pct: +((totalPlatformFees / total) * 100).toFixed(1), color: "#a855f7" },
      { name: "Payment Processing", value: +totalPaymentProcessing.toFixed(2), pct: +((totalPaymentProcessing / total) * 100).toFixed(1), color: "#eab308" },
      { name: "Refunds", value: +totalRefunds.toFixed(2), pct: +((totalRefunds / total) * 100).toFixed(1), color: "#ef4444" },
      { name: "Ad Spend", value: +totalAdSpend.toFixed(2), pct: +((totalAdSpend / total) * 100).toFixed(1), color: "#ec4899" },
      { name: "Other", value: +totalOther.toFixed(2), pct: +((totalOther / total) * 100).toFixed(1), color: "#6b7280" },
    ];

    // Campaign profits
    const campaignMap = new Map<string, { campaignName: string; adSpend: number; revenue: number; profit: number; roas: number; orders: number }>();
    for (const o of orders) {
      const name = typeof o.campaignName === "string" ? o.campaignName : "Organic";
      const existing = campaignMap.get(name) || { campaignName: name, adSpend: 0, revenue: 0, profit: 0, roas: 0, orders: 0 };
      existing.adSpend += typeof o.adSpend === "number" ? o.adSpend : 0;
      existing.revenue += typeof o.revenue === "number" ? o.revenue : 0;
      existing.profit += typeof o.netProfit === "number" ? o.netProfit : 0;
      existing.orders += 1;
      campaignMap.set(name, existing);
    }
    const campaignProfits = Array.from(campaignMap.values())
      .map((c) => ({ ...c, adSpend: +c.adSpend.toFixed(2), revenue: +c.revenue.toFixed(2), profit: +c.profit.toFixed(2), roas: c.adSpend > 0 ? +(c.revenue / c.adSpend).toFixed(2) : 0 }))
      .sort((a, b) => b.profit - a.profit);

    return NextResponse.json({
      summary: {
        totalRevenue: +totalRevenue.toFixed(2),
        totalProfit: +totalProfit.toFixed(2),
        totalCosts: +totalCosts.toFixed(2),
        avgMargin,
        refundRate,
        totalOrders: orders.length,
        topProducts: topProducts.slice(0, 5),
      },
      dailyBreakdown,
      topProducts,
      costBreakdown,
      campaignProfits,
      totalOrders: orders.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch profit data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(ProfitEntrySchema, body);
    if (!validation.success) return validation.response;
    const entry = validation.data;

    const db = await getAdminDB();
    const ref = await db.collection("users").doc(uid).collection("profitEntries").add({
      ...entry,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: ref.id });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to log profit entry", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

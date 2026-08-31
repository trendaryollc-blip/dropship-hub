import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";

interface ProfitSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalOrders: number;
  avgMargin: number;
  avgOrderValue: number;
  profitByProduct: Array<{
    productTitle: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    orders: number;
  }>;
  profitByPlatform: Array<{
    platform: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    orders: number;
  }>;
  dailyProfit: Array<{
    date: string;
    revenue: number;
    cost: number;
    profit: number;
    orders: number;
  }>;
  expenses: {
    adSpend: number;
    subscriptions: number;
    samples: number;
    other: number;
  };
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const rawDays = parseInt(searchParams.get("days") || "30");
    const days = Math.min(Math.max(1, isNaN(rawDays) ? 30 : rawDays), 365);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const db = await getAdminDB();

    // Get all profit entries within the date range
    const profitSnap = await db
      .collection("users")
      .doc(uid)
      .collection("profitEntries")
      .where("createdAt", ">=", startDate)
      .orderBy("createdAt", "desc")
      .get();

    const entries = profitSnap.docs.map((d) => d.data());

    if (entries.length === 0) {
      return NextResponse.json({
        summary: {
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          totalOrders: 0,
          avgMargin: 0,
          avgOrderValue: 0,
          profitByProduct: [],
          profitByPlatform: [],
          dailyProfit: [],
          expenses: { adSpend: 0, subscriptions: 0, samples: 0, other: 0 },
        },
        message: "No profit data yet. Start recording orders to see your profit dashboard.",
      });
    }

    // Calculate totals
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    const byProduct = new Map<string, { revenue: number; cost: number; profit: number; orders: number }>();
    const byPlatform = new Map<string, { revenue: number; cost: number; profit: number; orders: number }>();
    const byDate = new Map<string, { revenue: number; cost: number; profit: number; orders: number }>();

    for (const entry of entries) {
      const revenue = (entry.revenue as number) || 0;
      const cost = ((entry.cogs as number) || 0) + ((entry.shippingCost as number) || 0) + ((entry.platformFee as number) || 0) + ((entry.paymentProcessing as number) || 0);
      const profit = (entry.netProfit as number) || (revenue - cost);
      const productTitle = (entry.productTitle as string) || "Unknown";
      const platform = (entry.platform as string) || "Unknown";
      const date = ((entry.date as string) || new Date().toISOString()).split("T")[0];

      totalRevenue += revenue;
      totalCost += cost;
      totalProfit += profit;

      // By product
      const existingProduct = byProduct.get(productTitle) || { revenue: 0, cost: 0, profit: 0, orders: 0 };
      existingProduct.revenue += revenue;
      existingProduct.cost += cost;
      existingProduct.profit += profit;
      existingProduct.orders += 1;
      byProduct.set(productTitle, existingProduct);

      // By platform
      const existingPlatform = byPlatform.get(platform) || { revenue: 0, cost: 0, profit: 0, orders: 0 };
      existingPlatform.revenue += revenue;
      existingPlatform.cost += cost;
      existingPlatform.profit += profit;
      existingPlatform.orders += 1;
      byPlatform.set(platform, existingPlatform);

      // By date
      const existingDate = byDate.get(date) || { revenue: 0, cost: 0, profit: 0, orders: 0 };
      existingDate.revenue += revenue;
      existingDate.cost += cost;
      existingDate.profit += profit;
      existingDate.orders += 1;
      byDate.set(date, existingDate);
    }

    // Get expense entries
    const expenseSnap = await db
      .collection("users")
      .doc(uid)
      .collection("expenses")
      .where("createdAt", ">=", startDate)
      .get();

    const expenses = { adSpend: 0, subscriptions: 0, samples: 0, other: 0 };
    for (const doc of expenseSnap.docs) {
      const data = doc.data();
      const amount = (data.amount as number) || 0;
      const category = (data.category as string) || "other";
      if (category === "adSpend") expenses.adSpend += amount;
      else if (category === "subscriptions") expenses.subscriptions += amount;
      else if (category === "samples") expenses.samples += amount;
      else expenses.other += amount;
    }

    const totalExpenses = expenses.adSpend + expenses.subscriptions + expenses.samples + expenses.other;
    const netProfit = totalProfit - totalExpenses;

    const profitByProduct = Array.from(byProduct.entries())
      .map(([productTitle, data]) => ({
        productTitle,
        ...data,
        margin: data.revenue > 0 ? Math.round((data.profit / data.revenue) * 100) : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    const profitByPlatform = Array.from(byPlatform.entries())
      .map(([platform, data]) => ({
        platform,
        ...data,
        margin: data.revenue > 0 ? Math.round((data.profit / data.revenue) * 100) : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    const dailyProfit = Array.from(byDate.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const summary: ProfitSummary = {
      totalRevenue,
      totalCost,
      totalProfit: netProfit,
      totalOrders: entries.length,
      avgMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
      avgOrderValue: entries.length > 0 ? Math.round(totalRevenue / entries.length) : 0,
      profitByProduct,
      profitByPlatform,
      dailyProfit,
      expenses,
    };

    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate profit" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "addEntry") {
      const { productTitle, platform, revenue, cogs, shippingCost, platformFee, paymentProcessing, refunds, adSpend, date } = body;

      if (!productTitle || revenue === undefined) {
        return NextResponse.json({ error: "productTitle and revenue are required" }, { status: 400 });
      }

      const totalCost = (cogs || 0) + (shippingCost || 0) + (platformFee || 0) + (paymentProcessing || 0) + (refunds || 0) + (adSpend || 0);
      const netProfit = revenue - totalCost;
      const profitMargin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

      const db = await getAdminDB();
      const ref = await db.collection("users").doc(uid).collection("profitEntries").add({
        productTitle,
        platform: platform || "Unknown",
        date: date || new Date().toISOString().split("T")[0],
        revenue,
        cogs: cogs || 0,
        shippingCost: shippingCost || 0,
        platformFee: platformFee || 0,
        paymentProcessing: paymentProcessing || 0,
        refunds: refunds || 0,
        adSpend: adSpend || 0,
        netProfit,
        profitMargin,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, id: ref.id, netProfit, profitMargin });
    }

    if (action === "addExpense") {
      const { category, amount, description, date } = body;

      if (!category || amount === undefined) {
        return NextResponse.json({ error: "category and amount are required" }, { status: 400 });
      }

      const db = await getAdminDB();
      const ref = await db.collection("users").doc(uid).collection("expenses").add({
        category,
        amount,
        description: description || "",
        date: date || new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, id: ref.id });
    }

    if (action === "deleteEntry") {
      const { entryId } = body;
      if (!entryId) {
        return NextResponse.json({ error: "entryId is required" }, { status: 400 });
      }

      const db = await getAdminDB();
      await db.collection("users").doc(uid).collection("profitEntries").doc(entryId).delete();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
});

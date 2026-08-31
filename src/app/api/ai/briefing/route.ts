import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";

interface BriefingProduct {
  id: string;
  title: string;
  price: number;
  source: string;
  margin?: number;
  trend?: number;
}

interface BriefingAlert {
  type: "price_drop" | "price_increase" | "out_of_stock" | "competitor" | "opportunity";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  productId?: string;
}

interface DailyBriefing {
  date: string;
  summary: string;
  priceAlerts: BriefingAlert[];
  stockAlerts: BriefingAlert[];
  opportunities: BriefingAlert[];
  topProducts: BriefingProduct[];
  stats: {
    productsMonitored: number;
    priceDrops: number;
    priceIncreases: number;
    outOfStock: number;
    opportunities: number;
  };
  recommendations: string[];
}

function calculateOpportunityScore(product: {
  price: number;
  margin?: number;
  trend?: number;
  reviews?: number;
  competitionLevel?: string;
}): number {
  let score = 50;

  if (product.margin !== undefined) {
    if (product.margin > 60) score += 20;
    else if (product.margin > 40) score += 15;
    else if (product.margin > 25) score += 10;
    else if (product.margin < 15) score -= 10;
  }

  if (product.trend !== undefined) {
    if (product.trend > 20) score += 15;
    else if (product.trend > 10) score += 10;
    else if (product.trend < -10) score -= 10;
  }

  if (product.reviews !== undefined) {
    if (product.reviews > 100) score += 10;
    else if (product.reviews > 50) score += 5;
  }

  if (product.competitionLevel === "low") score += 10;
  else if (product.competitionLevel === "high") score -= 10;

  if (product.price < 10) score += 5;
  else if (product.price > 100) score -= 5;

  return Math.max(0, Math.min(100, score));
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const today = new Date().toISOString().split("T")[0];

    // Check if we already have a briefing for today
    const existingBriefing = await db
      .collection("users")
      .doc(uid)
      .collection("dailyBriefings")
      .where("date", "==", today)
      .limit(1)
      .get();

    if (!existingBriefing.empty) {
      return NextResponse.json({ briefing: existingBriefing.docs[0].data(), cached: true });
    }

    // Gather data from various sources
    const [monitoredSnap, watchlistSnap, profitSnap, alertsSnap] = await Promise.all([
      db.collection("users").doc(uid).collection("monitoredProducts").get(),
      db.collection("users").doc(uid).collection("watchlist").get(),
      db.collection("users").doc(uid).collection("profitEntries").orderBy("createdAt", "desc").limit(30).get(),
      db.collection("users").doc(uid).collection("alerts").where("read", "==", false).limit(20).get(),
    ]);

    const monitoredProducts = monitoredSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));
    const watchlistItems = watchlistSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));
    const profitEntries = profitSnap.docs.map((d) => d.data() as Record<string, unknown>);
    const unreadAlerts = alertsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));

    // Analyze price changes
    const priceAlerts: BriefingAlert[] = [];
    let priceDrops = 0;
    let priceIncreases = 0;
    let outOfStock = 0;

    for (const product of monitoredProducts) {
      const alerts = ((product.alerts as Array<{ type: string; message: string; read: boolean; createdAt: string }>) || []);
      const recentAlerts = alerts.filter((a) => !a.read && new Date(a.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000);

      for (const alert of recentAlerts) {
        if (alert.type === "price_drop") {
          priceDrops++;
          priceAlerts.push({
            type: "price_drop",
            title: "Price Drop Detected",
            description: alert.message,
            severity: "medium",
            productId: product.productId as string,
          });
        } else if (alert.type === "price_increase") {
          priceIncreases++;
          priceAlerts.push({
            type: "price_increase",
            title: "Price Increase Detected",
            description: alert.message,
            severity: "high",
            productId: product.productId as string,
          });
        } else if (alert.type === "out_of_stock") {
          outOfStock++;
          priceAlerts.push({
            type: "out_of_stock",
            title: "Product Out of Stock",
            description: alert.message,
            severity: "high",
            productId: product.productId as string,
          });
        } else if (alert.type === "back_in_stock") {
          priceAlerts.push({
            type: "opportunity",
            title: "Back in Stock",
            description: alert.message,
            severity: "low",
            productId: product.productId as string,
          });
        }
      }
    }

    // Find opportunities
    const opportunities: BriefingAlert[] = [];
    const lowStockCompetitors = monitoredProducts.filter(
      (p: Record<string, unknown>) => (p.stockStatus as string) === "out_of_stock"
    );
    if (lowStockCompetitors.length > 0) {
      opportunities.push({
        type: "opportunity",
        title: "Competitor Out of Stock",
        description: `${lowStockCompetitors.length} monitored products are out of stock on supplier platforms — opportunity to source elsewhere`,
        severity: "medium",
      });
    }

    const priceDropsList = monitoredProducts.filter((p: Record<string, unknown>) => {
      const history = p.priceHistory as Array<{ price: number }> | undefined;
      if (!history || history.length < 2) return false;
      const last = history[history.length - 1].price;
      const prev = history[history.length - 2].price;
      return last < prev * 0.9;
    });

    if (priceDropsList.length > 0) {
      opportunities.push({
        type: "opportunity",
        title: "Significant Price Drops",
        description: `${priceDropsList.length} products dropped 10%+ in price — consider stocking up`,
        severity: "high",
      });
    }

    // Build top products from profit data
    const topProducts: BriefingProduct[] = profitEntries.slice(0, 5).map((entry: Record<string, unknown>) => ({
      id: (entry.orderId as string) || "",
      title: (entry.productTitle as string) || "Unknown",
      price: (entry.revenue as number) || 0,
      source: (entry.platform as string) || "",
      margin: (entry.profitMargin as number) || 0,
    }));

    // Generate recommendations
    const recommendations: string[] = [];
    if (priceDrops > 0) {
      recommendations.push(`${priceDrops} products dropped in price — review your pricing strategy`);
    }
    if (outOfStock > 0) {
      recommendations.push(`${outOfStock} products are out of stock — find alternative suppliers`);
    }
    if (monitoredProducts.length === 0) {
      recommendations.push("Start monitoring products to get intelligent alerts and recommendations");
    }
    if (watchlistItems.length > 0) {
      recommendations.push(`You have ${watchlistItems.length} items on your watchlist — check for updates`);
    }

    const profitMargin = profitEntries.length > 0
      ? profitEntries.reduce((sum: number, e: Record<string, unknown>) => sum + ((e.profitMargin as number) || 0), 0) / profitEntries.length
      : 0;

    if (profitMargin > 0) {
      recommendations.push(`Your average profit margin is ${profitMargin.toFixed(1)}% — ${profitMargin > 30 ? "healthy" : "consider optimizing costs"}`);
    }

    // Build briefing
    const briefing: DailyBriefing = {
      date: today,
      summary: `Monitoring ${monitoredProducts.length} products. ${priceDrops} price drops, ${priceIncreases} increases, ${outOfStock} out of stock. ${opportunities.length} opportunities identified.`,
      priceAlerts: priceAlerts.slice(0, 10),
      stockAlerts: priceAlerts.filter((a) => a.type === "out_of_stock").slice(0, 5),
      opportunities,
      topProducts,
      stats: {
        productsMonitored: monitoredProducts.length,
        priceDrops,
        priceIncreases,
        outOfStock,
        opportunities: opportunities.length,
      },
      recommendations: recommendations.slice(0, 5),
    };

    // Save briefing
    await db.collection("users").doc(uid).collection("dailyBriefings").add({
      ...briefing,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ briefing });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate briefing" },
      { status: 500 }
    );
  }
});

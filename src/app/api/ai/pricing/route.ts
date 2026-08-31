import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";
import { safeNum, safeStr } from "@/lib/utils-helpers";

interface PriceSuggestion {
  id: string;
  productTitle: string;
  currentPrice: number;
  suggestedPrice: number;
  priceChange: number;
  priceChangePercent: number;
  confidence: number;
  strategy: "premium" | "competitive" | "penetration" | "bundle" | "maintain";
  reasoning: string;
  expectedImpact: string;
  competitorPrices: { name: string; price: number }[];
  marginAtSuggested: number;
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    // Fetch profit entries and cost profiles
    const [profitSnap, costSnap, lifecycleSnap] = await Promise.all([
      userRef.collection("profitEntries").orderBy("createdAt", "desc").limit(50).get(),
      userRef.collection("costProfiles").limit(20).get(),
      userRef.collection("productLifecycle").limit(20).get(),
    ]);

    const profitEntries = profitSnap.docs.map((d) => d.data() as DocumentData);
    const costProfiles = costSnap.docs.map((d) => d.data() as DocumentData);
    const lifecycle = lifecycleSnap.docs.map((d) => d.data() as DocumentData);

    // Group profit entries by product
    const productMap = new Map<string, { revenues: number[]; margins: number[]; orders: number }>();
    for (const entry of profitEntries) {
      const title = safeStr(entry.productTitle, "Unknown");
      const existing = productMap.get(title) || { revenues: [], margins: [], orders: 0 };
      existing.revenues.push(safeNum(entry.revenue));
      existing.margins.push(safeNum(entry.profitMargin));
      existing.orders += 1;
      productMap.set(title, existing);
    }

    // Generate price suggestions for each product
    const suggestions: PriceSuggestion[] = [];
    let idCounter = 0;

    for (const [title, data] of productMap) {
      if (data.revenues.length < 1) continue;

      const avgRevenue = data.revenues.reduce((a, b) => a + b, 0) / data.revenues.length;
      const avgMargin = data.margins.reduce((a, b) => a + b, 0) / data.margins.length;
      const currentPrice = avgRevenue;
      const costProfile = costProfiles.find((c) => safeStr(c.productTitle) === title);
      const cogs = costProfile ? safeNum(costProfile.cogs) : currentPrice * 0.35;

      // Determine strategy based on margin and order volume
      let strategy: PriceSuggestion["strategy"];
      let suggestedPrice: number;
      let reasoning: string;

      if (avgMargin < 15) {
        // Low margin — need to increase price
        strategy = "premium";
        suggestedPrice = currentPrice * 1.2;
        reasoning = `Current margin is only ${avgMargin.toFixed(1)}% — increasing price by 20% improves profitability while staying competitive`;
      } else if (avgMargin > 50 && data.orders < 5) {
        // High margin but low orders — price may be too high
        strategy = "penetration";
        suggestedPrice = currentPrice * 0.9;
        reasoning = `High margin (${avgMargin.toFixed(1)}%) but low volume — a 10% price reduction could increase orders`;
      } else if (data.orders > 20) {
        // High volume — consider bundle or slight increase
        strategy = "bundle";
        suggestedPrice = currentPrice * 1.05;
        reasoning = `High volume product (${data.orders} orders) — 5% increase or bundle offer to maximize revenue`;
      } else {
        strategy = "maintain";
        suggestedPrice = currentPrice * 1.02;
        reasoning = `Current pricing is performing well — a slight 2% increase to test price elasticity`;
      }

      const competitorPrices: { name: string; price: number }[] = [];

      const marginAtSuggested = suggestedPrice > 0
        ? +(((suggestedPrice - cogs) / suggestedPrice) * 100).toFixed(1)
        : 0;

      suggestions.push({
        id: `price-${++idCounter}`,
        productTitle: title,
        currentPrice: Math.round(currentPrice * 100) / 100,
        suggestedPrice: Math.round(suggestedPrice * 100) / 100,
        priceChange: Math.round((suggestedPrice - currentPrice) * 100) / 100,
        priceChangePercent: +(((suggestedPrice - currentPrice) / currentPrice) * 100).toFixed(1),
        confidence: Math.min(90, Math.max(50, 60 + data.orders * 0.5 + Math.abs(avgMargin - 25) * 0.3)),
        strategy,
        reasoning,
        expectedImpact: strategy === "premium" ? "Higher margins, potentially fewer orders" :
          strategy === "penetration" ? "Lower margins but more volume" :
          strategy === "bundle" ? "Increased average order value" :
          "Minimal change, testing market response",
        competitorPrices,
        marginAtSuggested,
      });
    }

    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({
      suggestions: suggestions.slice(0, 10),
      summary: {
        totalProducts: suggestions.length,
        priceIncreases: suggestions.filter((s) => s.priceChange > 0).length,
        priceDecreases: suggestions.filter((s) => s.priceChange < 0).length,
        avgConfidence: suggestions.length > 0
          ? Math.round(suggestions.reduce((s, sg) => s + sg.confidence, 0) / suggestions.length)
          : 0,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate price suggestions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

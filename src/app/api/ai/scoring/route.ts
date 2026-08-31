import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";

interface ProductScore {
  productId: string;
  title: string;
  opportunityScore: number;
  marginScore: number;
  trendScore: number;
  competitionScore: number;
  supplierScore: number;
  overallScore: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D";
  reasoning: string[];
}

function calculateMarginScore(margin: number): number {
  if (margin >= 60) return 95;
  if (margin >= 50) return 85;
  if (margin >= 40) return 75;
  if (margin >= 30) return 65;
  if (margin >= 20) return 50;
  if (margin >= 10) return 35;
  return 20;
}

function calculateTrendScore(priceHistory: number[]): number {
  if (priceHistory.length < 2) return 50;
  const recent = priceHistory.slice(-5);
  const older = priceHistory.slice(0, Math.max(1, priceHistory.length - 5));

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  if (olderAvg === 0) return 50;
  const change = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (change > 20) return 90;
  if (change > 10) return 75;
  if (change > 0) return 60;
  if (change > -10) return 45;
  if (change > -20) return 30;
  return 15;
}

function calculateCompetitionScore(sellerCount: number, priceSpread: number): number {
  let score = 50;
  if (sellerCount < 5) score += 25;
  else if (sellerCount < 10) score += 15;
  else if (sellerCount < 20) score += 5;
  else if (sellerCount > 50) score -= 20;
  else if (sellerCount > 30) score -= 10;

  if (priceSpread > 0.5) score += 15;
  else if (priceSpread > 0.3) score += 10;

  return Math.max(10, Math.min(95, score));
}

function calculateSupplierScore(supplierReliability: number, shippingDays: number): number {
  let score = 50;
  if (supplierReliability >= 95) score += 30;
  else if (supplierReliability >= 85) score += 20;
  else if (supplierReliability >= 75) score += 10;
  else if (supplierReliability < 60) score -= 20;

  if (shippingDays <= 5) score += 20;
  else if (shippingDays <= 10) score += 10;
  else if (shippingDays <= 15) score += 5;
  else if (shippingDays > 25) score -= 15;

  return Math.max(10, Math.min(95, score));
}

function getGrade(score: number): ProductScore["grade"] {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  return "D";
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { products } = body as {
      products: Array<{
        id: string;
        title: string;
        price: number;
        margin?: number;
        priceHistory?: number[];
        sellerCount?: number;
        priceSpread?: number;
        supplierReliability?: number;
        shippingDays?: number;
      }>;
    };

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: "products array is required" }, { status: 400 });
    }

    const scored: ProductScore[] = products.map((product) => {
      const marginScore = calculateMarginScore(product.margin || 0);
      const trendScore = calculateTrendScore(product.priceHistory || [product.price]);
      const competitionScore = calculateCompetitionScore(product.sellerCount || 10, product.priceSpread || 0.3);
      const supplierScore = calculateSupplierScore(product.supplierReliability || 80, product.shippingDays || 10);

      const overallScore = Math.round(
        marginScore * 0.3 + trendScore * 0.25 + competitionScore * 0.25 + supplierScore * 0.2
      );

      const reasoning: string[] = [];
      if (marginScore >= 75) reasoning.push(`Strong margin potential (${product.margin || 0}%)`);
      else if (marginScore < 40) reasoning.push(`Low margin (${product.margin || 0}%) — consider repricing`);

      if (trendScore >= 70) reasoning.push("Price trend is favorable");
      else if (trendScore < 40) reasoning.push("Price trend is declining");

      if (competitionScore >= 70) reasoning.push("Low competition — good opportunity");
      else if (competitionScore < 40) reasoning.push("High competition — differentiate or find niche");

      if (supplierScore >= 70) reasoning.push("Reliable supplier with fast shipping");
      else if (supplierScore < 40) reasoning.push("Supplier reliability concerns — consider alternatives");

      return {
        productId: product.id,
        title: product.title,
        opportunityScore: overallScore,
        marginScore,
        trendScore,
        competitionScore,
        supplierScore,
        overallScore,
        grade: getGrade(overallScore),
        reasoning,
      };
    });

    scored.sort((a, b) => b.overallScore - a.overallScore);

    return NextResponse.json({ products: scored });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to score products" },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();

    const [profitSnap, monitoredSnap, watchlistSnap] = await Promise.all([
      db.collection("users").doc(uid).collection("profitEntries").orderBy("createdAt", "desc").limit(50).get(),
      db.collection("users").doc(uid).collection("monitoredProducts").get(),
      db.collection("users").doc(uid).collection("watchlist").get(),
    ]);

    const profitEntries = profitSnap.docs.map((d) => d.data() as Record<string, unknown>);
    const monitoredProducts = monitoredSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));
    const watchlistItems = watchlistSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));

    // Build product scores from real data
    const productMap = new Map<string, {
      id: string;
      title: string;
      price: number;
      margin: number;
      priceHistory: number[];
      source: string;
    }>();

    for (const entry of profitEntries) {
      const key = entry.productTitle as string;
      if (!productMap.has(key)) {
        productMap.set(key, {
          id: entry.orderId as string || key,
          title: key,
          price: (entry.revenue as number) || 0,
          margin: (entry.profitMargin as number) || 0,
          priceHistory: [(entry.revenue as number) || 0],
          source: (entry.platform as string) || "",
        });
      } else {
        const existing = productMap.get(key)!;
        existing.priceHistory.push((entry.revenue as number) || 0);
      }
    }

    for (const monitored of monitoredProducts) {
      const key = monitored.productTitle as string;
      if (!productMap.has(key)) {
        const history = (monitored.priceHistory as Array<{ price: number }>) || [];
        productMap.set(key, {
          id: monitored.productId as string,
          title: key,
          price: (monitored.currentPrice as number) || 0,
          margin: 0,
          priceHistory: history.map((h) => h.price),
          source: (monitored.source as string) || "",
        });
      }
    }

    const products = Array.from(productMap.values());
    if (products.length === 0) {
      return NextResponse.json({ products: [], message: "No products to score yet. Start tracking products or recording profits." });
    }

    // Score each product
    const scored: ProductScore[] = products.map((product) => {
      const prices = product.priceHistory;
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : product.price;

      const marginScore = calculateMarginScore(product.margin);
      const trendScore = calculateTrendScore(prices);
      const competitionScore = 50;
      const supplierScore = 70;

      const overallScore = Math.round(
        marginScore * 0.3 + trendScore * 0.25 + competitionScore * 0.25 + supplierScore * 0.2
      );

      const reasoning: string[] = [];
      if (product.margin > 30) reasoning.push(`Good margin at ${product.margin.toFixed(1)}%`);
      if (prices.length > 1) {
        const trend = prices[prices.length - 1] - prices[0];
        if (trend > 0) reasoning.push("Price trend is upward");
        else if (trend < 0) reasoning.push("Price trend is declining");
      }

      return {
        productId: product.id,
        title: product.title,
        opportunityScore: overallScore,
        marginScore,
        trendScore,
        competitionScore,
        supplierScore,
        overallScore,
        grade: getGrade(overallScore),
        reasoning,
      };
    });

    scored.sort((a, b) => b.overallScore - a.overallScore);

    return NextResponse.json({ products: scored.slice(0, 20) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
});

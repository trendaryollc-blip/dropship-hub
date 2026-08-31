import { NextResponse } from "next/server";
import { searchCJProducts } from "@/lib/platform-search";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

interface CacheEntry<T> { data: T; expires: number; }
const dashboardCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = dashboardCache.get(key);
  if (!entry || Date.now() > entry.expires) {
    dashboardCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  dashboardCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

interface TickerItem {
  name: string;
  platform: string;
  price: number;
  change: number;
  sparkline: number[];
}

interface AIDailyPick {
  title: string;
  category: string;
  image: string;
  description: string;
  radarScores: null;
  sourcePrice: number;
  sellPrice: number;
  profit: number;
  margin: number;
  risk: "low" | "medium" | "high";
  reason: string;
  platform: string;
  ordersPerMonth: number;
  saturation: number;
  overallScore: number;
  earningsPreview: { profitPerOrder: number; ordersPerMonth: number; monthlyRevenue: number };
  reasonPoints: string[];
  expiresAt: string;
  yesterdayPick: null;
}

interface RevenueStat {
  label: string;
  value: number;
  change: null;
  up: null;
  icon: string;
  color: string;
  prefix?: string;
  sparkline: null;
}

interface NicheCard {
  name: string;
  category: string;
  scores: { demand: number; profit: number; competition: number; trend: null; seasonality: null };
  overallScore: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C";
  productCount: number;
  avgMargin: number;
  growth: null;
  aiInsight: null;
  demandSparkline: null;
  topProduct: string;
}

interface SupplierStatus {
  name: string;
  productCount: number;
  trustBadge: null;
  responseTime: null;
  responseLevel: null;
  completionRate: null;
  status: null;
  rating: null;
}

interface DailyMission {
  id: string;
  text: string;
  completed: boolean;
  xp: number;
}

interface HeatmapCategory {
  category: string;
  heat: number;
  productCount: number;
  avgMargin: null;
  trend: null;
  weeklyData: null;
  topProduct: string;
  topProductMargin: null;
  aiInsight: null;
  velocity: null;
}

interface TrendingProduct {
  name: string;
  platform: string;
  price: number;
  sellPrice: null;
  profit: null;
  margin: null;
  trend: null;
  sparkline: null;
  confidence: null;
  whyTrending: string;
  demandScore: null;
  demandLevel: null;
  competitionLevel: null;
  supplierReliability: null;
  monthlyVolume: null;
  shippingDays: string;
  sourceUrl: string;
  competitors: { name: string; price: number }[];
  listingSuggestion: { title: string; description: string };
}

interface AIBriefing {
  insights: string[];
  sentiment: null;
  sentimentLabel: string;
  opportunities: number;
  risks: number;
  trends: number;
  lastScan: string;
}

interface QuickActionStat {
  label: string;
  description: string;
  href: string;
  color: string;
  stat: string;
  statLabel: string;
}

export const GET = withAuth(async (request: Request) => {
  try {
    const categories = ["electronics", "fashion", "home gadgets", "beauty", "toys"];

    const cacheKey = "dashboard:trending";
    let categoryData = getCached<Record<string, { search_results: { title: string; price: number | null; image: string | null; link: string; source: string; rating?: number; reviews?: number }[] }>>(cacheKey);

    if (!categoryData) {
      categoryData = {};

      const results = await Promise.allSettled(
        categories.map(async (cat) => {
          const result = await searchCJProducts(cat);
          return { cat, result };
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value.result.search_results.length > 0) {
          categoryData![r.value.cat] = r.value.result;
        }
      }

      setCache(cacheKey, categoryData);
    }

    const allProducts = Object.entries(categoryData).flatMap(([cat, data]) =>
      data.search_results
        .filter((p) => p.price !== null && p.price > 0)
        .map((p) => ({ ...p, category: cat }))
    );

    if (allProducts.length === 0) {
      return NextResponse.json({
        ticker: [],
        aiDailyPick: null,
        revenueStats: [],
        alerts: [],
        nicheCards: [],
        supplierStatuses: [],
        dailyMissions: [],
        heatmap: [],
        trending: [],
        briefing: { insights: ["CJ Dropshipping API is temporarily unavailable. Please try again in a moment."], sentiment: null, sentimentLabel: "Neutral", opportunities: 0, risks: 0, trends: 0, lastScan: "retrying..." },
        pulse: [],
        actionStats: [],
      });
    }

    const ticker: TickerItem[] = allProducts.slice(0, 5).map((p) => ({
      name: p.title.length > 40 ? p.title.slice(0, 37) + "..." : p.title,
      platform: "CJ Dropshipping",
      price: Number((p.price ?? 0).toFixed(2)),
      change: 0,
      sparkline: [Number((p.price ?? 0).toFixed(2))],
    }));

    const bestProduct = allProducts.reduce((best, p) => {
      const score = (p.rating ?? 4) * 10 + (p.reviews ?? 100) / 10;
      const bestScore = (best.rating ?? 4) * 10 + (best.reviews ?? 100) / 10;
      return score > bestScore ? p : best;
    });

    const sourcePrice = bestProduct.price ?? 0;

    const aiDailyPick: AIDailyPick = {
      title: bestProduct.title,
      category: bestProduct.category,
      image: bestProduct.image || "",
      description: `High-potential product in ${bestProduct.category} with strong demand signals on CJ Dropshipping.`,
      radarScores: null,
      sourcePrice,
      sellPrice: Number((sourcePrice * 2.5).toFixed(2)),
      profit: Number((sourcePrice * 1.5).toFixed(2)),
      margin: 60,
      risk: "low",
      reason: `Competitive source price in ${bestProduct.category} with healthy margin potential.`,
      platform: "CJ Dropshipping",
      ordersPerMonth: 1200,
      saturation: 35,
      overallScore: 72,
      earningsPreview: {
        profitPerOrder: Number((sourcePrice * 1.5).toFixed(2)),
        ordersPerMonth: 1200,
        monthlyRevenue: Number((sourcePrice * 1.5 * 1200).toFixed(2)),
      },
      reasonPoints: [
        "Strong CJ supplier network",
        "Competitive sourcing price",
        `Growing demand in ${bestProduct.category}`,
        "Favorable margin-to-competition ratio",
      ],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      yesterdayPick: null,
    };

    const totalProducts = allProducts.length;
    const avgPrice = Number((allProducts.reduce((s, p) => s + (p.price ?? 0), 0) / totalProducts).toFixed(2));

    const revenueStats: RevenueStat[] = [
      {
        label: "Total Products Scanned",
        value: totalProducts,
        change: null,
        up: null,
        icon: "Package",
        color: "#6366f1",
        sparkline: null,
      },
      {
        label: "Average Source Price",
        value: avgPrice,
        change: null,
        up: null,
        icon: "DollarSign",
        color: "#10b981",
        prefix: "$",
        sparkline: null,
      },
      {
        label: "Active Categories",
        value: Object.keys(categoryData).length,
        change: null,
        up: null,
        icon: "LayoutGrid",
        color: "#8b5cf6",
        sparkline: null,
      },
    ];

    const nicheCards: NicheCard[] = Object.entries(categoryData).slice(0, 5).map(([cat, data]) => {
      const products = data.search_results.filter((p) => p.price !== null && p.price > 0);
      const avgMargin = products.length > 0 ? Math.round(30 + products.length * 2) : 0;
      const demand = Math.min(95, products.length * 10);
      const profit = Math.min(95, avgMargin);
      const competition = Math.max(10, 100 - products.length * 5);
      const overallScore = Math.round((demand + profit) / 2);
      const grade: NicheCard["grade"] = overallScore >= 85 ? "A+" : overallScore >= 75 ? "A" : overallScore >= 65 ? "B+" : overallScore >= 55 ? "B" : overallScore >= 45 ? "C+" : "C";
      return {
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        category: cat,
        scores: { demand, profit, competition, trend: null, seasonality: null },
        overallScore,
        grade,
        productCount: data.search_results.length,
        avgMargin,
        growth: null,
        aiInsight: null,
        demandSparkline: null,
        topProduct: products[0]?.title?.slice(0, 50) || "N/A",
      };
    });

    const supplierStatus: SupplierStatus = {
      name: "CJ Dropshipping",
      productCount: totalProducts,
      trustBadge: null,
      responseTime: null,
      responseLevel: null,
      completionRate: null,
      status: null,
      rating: null,
    };

    const dailyMissions: DailyMission[] = [
      { id: "m1", text: "Search 3 product categories", completed: Object.keys(categoryData).length >= 3, xp: 50 },
      { id: "m2", text: "Find a product under $5", completed: allProducts.some((p) => p.price! < 5), xp: 30 },
      { id: "m3", text: "Identify a trending niche", completed: nicheCards.length > 0, xp: 40 },
    ];

    const heatmap: HeatmapCategory[] = Object.entries(categoryData).map(([cat, data]) => {
      const products = data.search_results.filter((p) => p.price !== null && p.price > 0);
      const heat = Math.min(100, Math.round((data.search_results.length / 20) * 100));
      const topProduct = products.length > 0 ? products[0].title.slice(0, 30) : "N/A";
      return {
        category: cat,
        productCount: data.search_results.length,
        avgMargin: null,
        trend: null,
        weeklyData: null,
        topProduct,
        topProductMargin: null,
        aiInsight: null,
        velocity: null,
        heat,
      };
    });

    const trendingProducts: TrendingProduct[] = allProducts.slice(0, 6).map((p) => {
      const sourcePrice = p.price ?? 0;

      const categoryProducts = allProducts.filter((ap) => ap.category === p.category && ap.title !== p.title);
      const competitors = categoryProducts.slice(0, 3).map((cp) => ({
        name: cp.title.length > 35 ? cp.title.slice(0, 32) + "..." : cp.title,
        price: Number((cp.price ?? 0).toFixed(2)),
      }));

      const titleWords = p.title.split(" ").slice(0, 5).join(" ");

      return {
        name: p.title.length > 60 ? p.title.slice(0, 57) + "..." : p.title,
        platform: "CJ Dropshipping",
        price: sourcePrice,
        sellPrice: null,
        profit: null,
        margin: null,
        trend: null,
        sparkline: null,
        confidence: null,
        whyTrending: `${p.category} product with $${sourcePrice} source price. ${(p.reviews ?? 0) > 50 ? "High review count signals strong demand." : "Growing category with room for new sellers."}`,
        demandScore: null,
        demandLevel: null,
        competitionLevel: null,
        supplierReliability: null,
        monthlyVolume: null,
        shippingDays: "7-15",
        sourceUrl: p.link || "#",
        competitors,
        listingSuggestion: {
          title: `${titleWords} — Premium Quality, Fast Shipping`,
          description: `High-quality ${p.category} product. Competitive pricing. Free returns, fast processing via CJ Dropshipping.`,
        },
      };
    });

    const priceDrops = allProducts.filter((p) => (p.price ?? 0) < 5).length;
    const highMarginProducts = allProducts.filter((p) => {
      const price = p.price ?? 0;
      const sp = price * 2.5 + 4.99;
      return ((sp - price) / sp) * 100 > 60;
    }).length;

    const insights: string[] = [];
    if (bestProduct) {
      insights.push(`${bestProduct.title.slice(0, 50)} is the top-rated product in ${bestProduct.category}`);
    }
    if (priceDrops > 0) {
      insights.push(`${priceDrops} products under $5 detected — low-cost, high-margin opportunities available`);
    }
    if (highMarginProducts > 0) {
      insights.push(`${highMarginProducts} products with 60%+ profit margin found across ${Object.keys(categoryData).length} categories`);
    }
    insights.push(`${totalProducts} products scanned from CJ Dropshipping — average source price $${avgPrice}`);
    if (Object.keys(categoryData).length >= 3) {
      insights.push(`${Object.keys(categoryData).length} active categories with strong product availability`);
    }

    const oppCount = highMarginProducts + priceDrops;
    const riskCount = allProducts.filter((p) => p.price! > 30).length > 0 ? 1 : 0;
    const trendCount = Object.keys(categoryData).length;

    const aiBriefing: AIBriefing = {
      insights,
      sentiment: null,
      sentimentLabel: "Neutral",
      opportunities: oppCount,
      risks: riskCount,
      trends: trendCount,
      lastScan: "just now",
    };

    const quickActions: QuickActionStat[] = [
      { label: "Search Products", description: "Discover new items to sell", href: "/products", color: "blue", stat: `${totalProducts}`, statLabel: "scanned this week" },
      { label: "Find Suppliers", description: "Compare supplier options", href: "/suppliers", color: "emerald", stat: `${Object.keys(categoryData).length}/${categories.length}`, statLabel: "suppliers online" },
      { label: "Calculate Profit", description: "Estimate your margins", href: "/calculator", color: "amber", stat: `${totalProducts}`, statLabel: "products analyzed" },
      { label: "AI Assistant", description: "Get smart recommendations", href: "/ai", color: "purple", stat: `${oppCount}`, statLabel: "new suggestions" },
    ];

    return NextResponse.json({
      ticker,
      aiDailyPick,
      revenueStats,
      alerts: [],
      nicheCards,
      supplierStatuses: [supplierStatus],
      dailyMissions,
      heatmap,
      trending: trendingProducts,
      briefing: aiBriefing,
      pulse: null,
      actionStats: quickActions,
    });
  } catch {
    return NextResponse.json({
      ticker: [],
      aiDailyPick: null,
      revenueStats: [],
      alerts: [],
      nicheCards: [],
      supplierStatuses: [],
      dailyMissions: [],
      heatmap: [],
      trending: [],
      briefing: { insights: ["System recovering — please try again"], sentiment: null, sentimentLabel: "Neutral", opportunities: 0, risks: 0, trends: 0, lastScan: "retrying..." },
      pulse: null,
      actionStats: [],
    });
  }
}, LIMITS.DEFAULT);

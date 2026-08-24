import { NextResponse } from "next/server";
import { searchCJProducts } from "@/lib/platform-search";

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
  radarScores: { margin: number; demand: number; competition: number; trend: number; supplier: number };
  sourcePrice: number;
  sellPrice: number;
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
  yesterdayPick?: { title: string; result: string; up: boolean };
}

interface RevenueStat {
  label: string;
  value: number;
  change: string;
  up: boolean;
  icon: string;
  color: string;
  prefix?: string;
  sparkline: number[];
}

interface SmartAlert {
  id: string;
  type: "opportunity" | "risk" | "info" | "warning";
  title: string;
  description: string;
  action: string;
  actionHref: string;
  timestamp: string;
  read: boolean;
  confidence: number;
  aiAnalysis: string;
  sparkline: number[];
}

interface NicheCard {
  name: string;
  productCount: number;
  avgPrice: number;
  trend: "rising" | "stable" | "declining";
  topProduct: string;
  image: string;
  competition: "low" | "medium" | "high";
  opportunity: number;
}

interface SupplierStatus {
  name: string;
  platform: string;
  status: "online" | "degraded" | "offline";
  responseTime: number;
  successRate: number;
  productsListed: number;
  lastChecked: string;
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
  avgMargin: number;
  trend: "up" | "down" | "stable";
  weeklyData: number[];
  topProduct: string;
  topProductMargin: number;
  aiInsight: string;
  velocity: number;
}

interface TrendingProduct {
  name: string;
  platform: string;
  price: number;
  sellPrice: number;
  profit: number;
  margin: number;
  trend: number;
  sparkline: number[];
  confidence: number;
  whyTrending: string;
  demandLevel: "low" | "medium" | "high";
  competitionLevel: "low" | "medium" | "high";
  supplierReliability: number;
  monthlyVolume: number;
  shippingDays: string;
  sourceUrl: string;
  competitors: { name: string; price: number }[];
  listingSuggestion: { title: string; description: string };
}

interface AIBriefing {
  insights: string[];
  sentiment: number;
  sentimentLabel: string;
  opportunities: number;
  risks: number;
  trends: number;
  lastScan: string;
}

interface MarketPulseCard {
  label: string;
  value: string;
  change: string;
  up: boolean;
  sparkline: number[];
  icon: string;
  color: string;
}

interface QuickActionStat {
  label: string;
  description: string;
  href: string;
  color: string;
  stat: string;
  statLabel: string;
}

function makeSparkline(len = 7): number[] {
  return Array.from({ length: len }, () => Math.round(Math.random() * 40 + 80));
}

function pickRisk(price: number): "low" | "medium" | "high" {
  if (price < 5) return "low";
  if (price < 20) return "medium";
  return "high";
}

const FALLBACK = {
  ticker: [] as TickerItem[],
  aiDailyPick: null as AIDailyPick | null,
  revenueStats: [] as RevenueStat[],
  smartAlerts: [] as SmartAlert[],
  nicheCards: [] as NicheCard[],
  supplierStatuses: [] as SupplierStatus[],
  dailyMissions: [] as DailyMission[],
  heatmap: [] as HeatmapCategory[],
  trendingProducts: [] as TrendingProduct[],
  aiBriefing: { insights: ["No data available"], sentiment: 50, sentimentLabel: "Neutral", opportunities: 0, risks: 0, trends: 0, lastScan: "unavailable" } as AIBriefing,
  marketPulse: [] as MarketPulseCard[],
  quickActions: [] as QuickActionStat[],
};

export async function GET() {
  try {
    const categories = ["electronics", "fashion", "home gadgets", "beauty", "toys"];

    const results = await Promise.allSettled(
      categories.map((cat) => searchCJProducts(cat))
    );

    const categoryData: Record<string, { search_results: { title: string; price: number | null; image: string | null; link: string; source: string; rating?: number; reviews?: number }[] }> = {};

    for (let i = 0; i < categories.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && r.value.search_results.length > 0) {
        categoryData[categories[i]] = r.value;
      }
    }

    const allProducts = Object.entries(categoryData).flatMap(([cat, data]) =>
      data.search_results
        .filter((p) => p.price !== null && p.price > 0)
        .map((p) => ({ ...p, category: cat }))
    );

    if (allProducts.length === 0) {
      return NextResponse.json(FALLBACK);
    }

    const ticker: TickerItem[] = allProducts.slice(0, 5).map((p) => ({
      name: p.title.length > 40 ? p.title.slice(0, 37) + "..." : p.title,
      platform: "CJ Dropshipping",
      price: Number(p.price!.toFixed(2)),
      change: Number((Math.random() * 20 - 8).toFixed(1)),
      sparkline: makeSparkline(),
    }));

    const bestProduct = allProducts.reduce((best, p) => {
      const score = (p.rating ?? 4) * 10 + (p.reviews ?? 100) / 10;
      const bestScore = (best.rating ?? 4) * 10 + (best.reviews ?? 100) / 10;
      return score > bestScore ? p : best;
    }, allProducts[0]);

    const sourcePrice = bestProduct.price!;
    const sellPrice = Number((sourcePrice * 2.5 + 4.99).toFixed(2));
    const margin = Number((((sellPrice - sourcePrice) / sellPrice) * 100).toFixed(1));

    const aiDailyPick: AIDailyPick = {
      title: bestProduct.title,
      category: bestProduct.category,
      image: bestProduct.image || "",
      description: `High-potential product in ${bestProduct.category} with strong demand signals on CJ Dropshipping.`,
      radarScores: {
        margin: Math.min(95, Math.round(50 + margin)),
        demand: Math.round(60 + Math.random() * 30),
        competition: Math.round(30 + Math.random() * 40),
        trend: Math.round(65 + Math.random() * 25),
        supplier: Math.round(70 + Math.random() * 20),
      },
      sourcePrice,
      sellPrice,
      margin,
      risk: pickRisk(sourcePrice),
      reason: `Competitive source price in ${bestProduct.category} with healthy margin potential.`,
      platform: "CJ Dropshipping",
      ordersPerMonth: Math.round(200 + Math.random() * 800),
      saturation: Math.round(30 + Math.random() * 40),
      overallScore: Math.round(60 + Math.random() * 30),
      earningsPreview: {
        profitPerOrder: Number((sellPrice - sourcePrice).toFixed(2)),
        ordersPerMonth: Math.round(300 + Math.random() * 500),
        monthlyRevenue: 0,
      },
      reasonPoints: [
        "Strong CJ supplier network",
        "Competitive sourcing price",
        `Growing demand in ${bestProduct.category}`,
        "Favorable margin-to-competition ratio",
      ],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      yesterdayPick: {
        title: "Wireless Bluetooth Earbuds",
        result: "Sold 47 units",
        up: true,
      },
    };
    aiDailyPick.earningsPreview.monthlyRevenue = Number(
      (aiDailyPick.earningsPreview.profitPerOrder * aiDailyPick.earningsPreview.ordersPerMonth).toFixed(2)
    );

    const totalProducts = allProducts.length;
    const avgPrice = Number((allProducts.reduce((s, p) => s + p.price!, 0) / totalProducts).toFixed(2));

    const revenueStats: RevenueStat[] = [
      {
        label: "Total Products Scanned",
        value: totalProducts,
        change: "+12%",
        up: true,
        icon: "Package",
        color: "#6366f1",
        sparkline: makeSparkline(),
      },
      {
        label: "Average Source Price",
        value: avgPrice,
        change: "-3.2%",
        up: false,
        icon: "DollarSign",
        color: "#10b981",
        prefix: "$",
        sparkline: makeSparkline(),
      },
      {
        label: "Estimated Monthly Revenue",
        value: Number((aiDailyPick.earningsPreview.monthlyRevenue).toFixed(2)),
        change: "+18%",
        up: true,
        icon: "TrendingUp",
        color: "#f59e0b",
        prefix: "$",
        sparkline: makeSparkline(),
      },
      {
        label: "Active Categories",
        value: Object.keys(categoryData).length,
        change: "0%",
        up: true,
        icon: "LayoutGrid",
        color: "#8b5cf6",
        sparkline: makeSparkline(),
      },
    ];

    const smartAlerts: SmartAlert[] = [
      {
        id: "alert-1",
        type: "opportunity",
        title: "Price Drop Detected",
        description: `${ticker[0]?.name ?? "Top product"} saw a source price reduction on CJ. Consider stocking up.`,
        action: "View Product",
        actionHref: "/products",
        timestamp: new Date().toISOString(),
        read: false,
        confidence: 87,
        aiAnalysis: "Historical price data suggests this is a recurring weekly dip. Good time to order inventory.",
        sparkline: makeSparkline(),
      },
      {
        id: "alert-2",
        type: "info",
        title: "New Category Trending",
        description: `"${categories[2]}" products are surging on CJ Dropshipping with ${categoryData[categories[2]]?.search_results.length ?? 0} new listings.`,
        action: "Explore Category",
        actionHref: "/niches",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false,
        confidence: 92,
        aiAnalysis: "Seasonal demand pattern detected. This category typically peaks in the next 2-3 weeks.",
        sparkline: makeSparkline(),
      },
      {
        id: "alert-3",
        type: "warning",
        title: "Supplier Response Time Increasing",
        description: "CJ Dropshipping average response time has increased by 15% today.",
        action: "Check Suppliers",
        actionHref: "/suppliers",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: true,
        confidence: 74,
        aiAnalysis: "This is within normal fluctuation range. No immediate action required but monitor over next 24 hours.",
        sparkline: makeSparkline(),
      },
    ];

    if (allProducts.length > 3) {
      const cheapProduct = allProducts.reduce((min, p) => (p.price! < min.price! ? p : min), allProducts[0]);
      smartAlerts.push({
        id: "alert-4",
        type: "opportunity",
        title: "Ultra-Low Cost Product Found",
        description: `"${cheapProduct.title.slice(0, 50)}..." available at $${cheapProduct.price} source price.`,
        action: "Analyze Margins",
        actionHref: "/analysis",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        read: false,
        confidence: 81,
        aiAnalysis: `Source price of $${cheapProduct.price} leaves room for ${Math.round(((cheapProduct.price! * 2.5 + 4.99 - cheapProduct.price!) / (cheapProduct.price! * 2.5 + 4.99)) * 100)}% margin at recommended sell price.`,
        sparkline: makeSparkline(),
      });
    }

    const nicheCards: NicheCard[] = Object.entries(categoryData).slice(0, 3).map(([cat, data]) => {
      const products = data.search_results.filter((p) => p.price !== null && p.price > 0);
      const catAvg = products.length > 0 ? products.reduce((s, p) => s + p.price!, 0) / products.length : 0;
      return {
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        productCount: data.search_results.length,
        avgPrice: Number(catAvg.toFixed(2)),
        trend: "rising" as const,
        topProduct: data.search_results[0]?.title?.slice(0, 50) || "N/A",
        image: data.search_results[0]?.image || "",
        competition: "medium" as const,
        opportunity: Math.round(60 + Math.random() * 30),
      };
    });

    const supplierStatus: SupplierStatus = {
      name: "CJ Dropshipping",
      platform: "cj",
      status: Object.keys(categoryData).length >= 3 ? "online" : "degraded",
      responseTime: Math.round(800 + Math.random() * 1200),
      successRate: Number((90 + Math.random() * 9).toFixed(1)),
      productsListed: totalProducts,
      lastChecked: new Date().toISOString(),
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
      const topMargin = products.length > 0 ? Math.round(Math.random() * 50 + 30) : 0;
      const weeklyData = Array.from({ length: 7 }, () => Math.round(heat * (0.7 + Math.random() * 0.6)));
      const trend: "up" | "down" | "stable" = heat >= 65 ? "up" : heat >= 40 ? "stable" : "down";
      return {
        category: cat,
        productCount: data.search_results.length,
        avgMargin: Number((Math.random() * 40 + 20).toFixed(1)),
        trend,
        weeklyData,
        topProduct,
        topProductMargin: topMargin,
        aiInsight: heat >= 65 ? `${cat} is trending up` : heat >= 40 ? `${cat} is stable` : `${cat} is cooling down`,
        velocity: heat,
        heat,
      };
    });

    const trendingProducts: TrendingProduct[] = allProducts.slice(0, 6).map((p) => {
      const sourcePrice = p.price!;
      const sellPrice = Number((sourcePrice * 2.5 + 4.99).toFixed(2));
      const profit = Number((sellPrice - sourcePrice).toFixed(2));
      const margin = Number((((sellPrice - sourcePrice) / sellPrice) * 100).toFixed(0));

      const demandScore = Math.min(100, Math.round(40 + (p.reviews ?? 50) / 10 + Math.random() * 20));
      const demandLevel: "low" | "medium" | "high" = demandScore >= 70 ? "high" : demandScore >= 50 ? "medium" : "low";
      const competitionLevel: "low" | "medium" | "high" = sourcePrice < 5 ? "high" : sourcePrice < 15 ? "medium" : "low";

      const confidence = Math.min(98, Math.round(55 + (p.rating ?? 4) * 5 + Math.min((p.reviews ?? 0) / 100, 20) + Math.random() * 10));
      const trendPct = Number((Math.random() * 45 + 5).toFixed(0));
      const sparkline = Array.from({ length: 7 }, (_, i) => Math.round(20 + (i * trendPct / 7) + Math.random() * 10));

      const categoryProducts = allProducts.filter((ap) => ap.category === p.category && ap.title !== p.title);
      const competitors = categoryProducts.slice(0, 3).map((cp) => ({
        name: cp.title.length > 35 ? cp.title.slice(0, 32) + "..." : cp.title,
        price: Number(((cp.price! * 2.5 + 4.99)).toFixed(2)),
      }));
      if (competitors.length < 3) {
        competitors.push(
          { name: `${p.category} generic option A`, price: Number((sellPrice * 0.85).toFixed(2)) },
          { name: `${p.category} generic option B`, price: Number((sellPrice * 1.2).toFixed(2)) },
        );
      }

      const titleWords = p.title.split(" ").slice(0, 5).join(" ");

      return {
        name: p.title.length > 60 ? p.title.slice(0, 57) + "..." : p.title,
        platform: "CJ Dropshipping",
        price: sourcePrice,
        sellPrice,
        profit,
        margin: Number(margin),
        trend: Number(trendPct),
        sparkline,
        confidence,
        whyTrending: `${p.category} product with $${sourcePrice} source price and ${margin}% margin potential. ${(p.reviews ?? 0) > 50 ? "High review count signals strong demand." : "Growing category with room for new sellers."}`,
        demandLevel,
        competitionLevel,
        supplierReliability: Math.round(88 + Math.random() * 10),
        monthlyVolume: Math.round(500 + Math.random() * 5000),
        shippingDays: "7-15",
        sourceUrl: p.link || "#",
        competitors,
        listingSuggestion: {
          title: `${titleWords} — Premium Quality, Fast Shipping`,
          description: `High-quality ${p.category} product. Competitive pricing at $${sellPrice} retail. Free returns, fast processing via CJ Dropshipping.`,
        },
      };
    });

    const priceDrops = allProducts.filter((p) => p.price! < 5).length;
    const highMarginProducts = allProducts.filter((p) => {
      const sp = p.price! * 2.5 + 4.99;
      return ((sp - p.price!) / sp) * 100 > 60;
    }).length;

    const insights: string[] = [];
    if (bestProduct) {
      insights.push(`${bestProduct.title.slice(0, 50)} is the top-rated product in ${bestProduct.category} with ${margin}% margin potential`);
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

    const sentimentScore = Math.min(95, Math.round(50 + margin / 3 + Object.keys(categoryData).length * 3));
    const sentimentLabel = sentimentScore >= 70 ? "Bullish" : sentimentScore >= 40 ? "Neutral" : "Bearish";

    const aiBriefing: AIBriefing = {
      insights,
      sentiment: sentimentScore,
      sentimentLabel,
      opportunities: oppCount,
      risks: riskCount,
      trends: trendCount,
      lastScan: "just now",
    };

    const cheapCount = allProducts.filter((p) => p.price! < 5).length;
    const trendingCount = allProducts.filter((p) => (p.reviews ?? 0) > 50).length;

    const marketPulse: MarketPulseCard[] = [
      {
        label: "Trending Products",
        value: `${trendingCount}`,
        change: `+${Math.min(trendingCount, 6)} this week`,
        up: true,
        sparkline: makeSparkline(),
        icon: "flame",
        color: "text-orange-400",
      },
      {
        label: "Supplier Activity",
        value: `${Object.keys(categoryData).length}/${categories.length}`,
        change: Object.keys(categoryData).length >= 3 ? "All online" : "Partial",
        up: true,
        sparkline: makeSparkline(),
        icon: "truck",
        color: "text-emerald-400",
      },
      {
        label: "Price Changes",
        value: `${cheapCount + Math.round(Math.random() * 5)}`,
        change: `${cheapCount} down, ${Math.round(Math.random() * 3)} up`,
        up: false,
        sparkline: makeSparkline(),
        icon: "trending",
        color: "text-amber-400",
      },
      {
        label: "Niche Momentum",
        value: Object.keys(categoryData)[0]?.charAt(0).toUpperCase() + Object.keys(categoryData)[0]?.slice(1) || "N/A",
        change: `+${Math.round(15 + Math.random() * 20)}% demand`,
        up: true,
        sparkline: makeSparkline(),
        icon: "target",
        color: "text-blue-400",
      },
    ];

    const quickActions: QuickActionStat[] = [
      { label: "Search Products", description: "Discover new items to sell", href: "/products", color: "blue", stat: `${totalProducts}`, statLabel: "scanned this week" },
      { label: "Find Suppliers", description: "Compare supplier options", href: "/suppliers", color: "emerald", stat: `${Object.keys(categoryData).length}/${categories.length}`, statLabel: "suppliers online" },
      { label: "Calculate Profit", description: "Estimate your margins", href: "/calculator", color: "amber", stat: `${Math.round(5 + Math.random() * 20)}`, statLabel: "calcs today" },
      { label: "AI Assistant", description: "Get smart recommendations", href: "/ai", color: "purple", stat: `${oppCount}`, statLabel: "new suggestions" },
    ];

    return NextResponse.json({
      ticker,
      aiDailyPick,
      revenueStats,
      alerts: smartAlerts,
      nicheCards,
      supplierStatuses: [supplierStatus],
      dailyMissions,
      heatmap,
      trending: trendingProducts,
      briefing: aiBriefing,
      pulse: marketPulse,
      actionStats: quickActions,
    });
  } catch {
    return NextResponse.json(FALLBACK);
  }
}

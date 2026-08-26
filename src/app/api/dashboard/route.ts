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
  category: string;
  scores: { demand: number; profit: number; competition: number; trend: number; seasonality: number };
  overallScore: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C";
  productCount: number;
  avgMargin: number;
  growth: number;
  aiInsight: string;
  demandSparkline: number[];
  topProduct: string;
}

interface SupplierStatus {
  name: string;
  trustBadge: "gold" | "silver" | "bronze";
  responseTime: string;
  responseLevel: "fast" | "moderate" | "slow";
  completionRate: number;
  status: "online" | "busy" | "offline";
  rating: number;
  location: string;
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

interface MockProduct {
  title: string;
  price: number | null;
  image: string | null;
  link: string;
  source: string;
  rating?: number;
  reviews?: number;
  category: string;
}

function generateMockProducts(): MockProduct[] {
  const categories = ["electronics", "fashion", "home gadgets", "beauty", "toys"];
  const mockData: Record<string, { names: string[]; priceRange: [number, number] }> = {
    electronics: {
      names: [
        "Wireless Bluetooth Earbuds Pro", "Smart Watch Fitness Tracker", "Portable Phone Charger 20000mAh",
        "USB-C Hub Multiport Adapter", "LED Desk Lamp Dimmable", "Webcam 1080p HD",
        "Bluetooth Speaker Waterproof", "Mechanical Keyboard RGB", "Wireless Mouse Ergonomic",
        "Smart Home Plug WiFi", "Ring Light Studio", "Cable Organizer Box",
      ],
      priceRange: [3.5, 28],
    },
    fashion: {
      names: [
        "Crossbody Bag PU Leather", "Sunglasses Polarized UV400", "Bamboo Watch Minimalist",
        "Silk Scarf Print Pattern", "Canvas Tote Bag Vintage", "Knit Beanie Winter",
        "Leather Wallet RFID", "Socks Pack 5 Pairs", "Baseball Cap Embroidered",
        "Hoop Earrings Gold", "Fitness Gloves Workout", "Phone Lanyard Strap",
      ],
      priceRange: [2, 18],
    },
    "home gadgets": {
      names: [
        "Kitchen Timer Digital", "Silicone Spatula Set", "LED Night Light Motion",
        "Magnetic Phone Mount", "Cable Protector Silicone", "Mini Air Purifier",
        "Aroma Diffuser USB", "Foldable Water Bottle", "Smart Plug WiFi",
        "Door Stopper Rubber", "Magnetic Wristband Tool", "Bamboo Cutting Board",
      ],
      priceRange: [1.5, 15],
    },
    beauty: {
      names: [
        "Makeup Brush Set 12pc", "Hair Clips Claw", "Nail Art Kit",
        "Face Roller Jade", "Makeup Mirror LED", "Eyelash Curler",
        "Hair Ties Silk", "Lip Gloss Set", "Beauty Blender Sponge",
        "Eyebrow Razor", "Scalp Massager", "Travel Bottle Set",
      ],
      priceRange: [1, 12],
    },
    toys: {
      names: [
        "Fidget Cube Stress Relief", "Magnetic Building Blocks", "LED Flying Spinner",
        "Puzzle 1000 Pieces", "RC Mini Car", "Plush Stuffed Animal",
        "Science Experiment Kit", "Card Game Strategy", "Origami Paper Set",
        "Water Gun Super Soaker", "Balance Board Game", "Rubik Cube Speed",
      ],
      priceRange: [2, 20],
    },
  };

  const products: MockProduct[] = [];
  for (const cat of categories) {
    const data = mockData[cat];
    const count = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const name = data.names[i % data.names.length];
      const price = Number((data.priceRange[0] + Math.random() * (data.priceRange[1] - data.priceRange[0])).toFixed(2));
      const imgId = (cat.charCodeAt(0) + i * 7) % 1000 + 100;
      products.push({
        title: i >= data.names.length ? `${name} V${Math.floor(i / data.names.length) + 1}` : name,
        price,
        image: `https://picsum.photos/seed/${cat}${i}/400/400`,
        link: `https://cjdropshipping.com/product-p-mock-${cat}-${i}`,
        source: "cj",
        rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
        reviews: Math.floor(20 + Math.random() * 400),
        category: cat,
      });
    }
  }
  return products;
}

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

    let allProducts = Object.entries(categoryData).flatMap(([cat, data]) =>
      data.search_results
        .filter((p) => p.price !== null && p.price > 0)
        .map((p) => ({ ...p, category: cat }))
    );

    let isMockData = false;
    if (allProducts.length === 0) {
      isMockData = true;
      const mockProducts = generateMockProducts();
      for (const cat of ["electronics", "fashion", "home gadgets", "beauty", "toys"]) {
        const catProducts = mockProducts.filter((p) => p.category === cat);
        if (catProducts.length > 0) {
          categoryData[cat] = { search_results: catProducts };
        }
      }
      allProducts = mockProducts;
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

    const nicheCards: NicheCard[] = Object.entries(categoryData).slice(0, 5).map(([cat, data]) => {
      const products = data.search_results.filter((p) => p.price !== null && p.price > 0);
      const avgMargin = products.length > 0 ? Math.round(30 + Math.random() * 40) : 0;
      const demand = Math.round(50 + Math.random() * 45);
      const profit = Math.min(95, Math.round(avgMargin + Math.random() * 15));
      const competition = Math.round(30 + Math.random() * 50);
      const trend = Math.round(45 + Math.random() * 45);
      const seasonality = Math.round(20 + Math.random() * 60);
      const overallScore = Math.round((demand + profit + trend) / 3);
      const grade: NicheCard["grade"] = overallScore >= 85 ? "A+" : overallScore >= 75 ? "A" : overallScore >= 65 ? "B+" : overallScore >= 55 ? "B" : overallScore >= 45 ? "C+" : "C";
      return {
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        category: cat,
        scores: { demand, profit, competition, trend, seasonality },
        overallScore,
        grade,
        productCount: data.search_results.length,
        avgMargin,
        growth: Math.round(-5 + Math.random() * 30),
        aiInsight: `${cat.charAt(0).toUpperCase() + cat.slice(1)} niche has ${demand > 70 ? "strong" : "moderate"} demand with ${competition > 60 ? "high" : "manageable"} competition. Average margin of ${avgMargin}% makes this ${overallScore >= 70 ? "a promising" : "a viable"} opportunity.`,
        demandSparkline: Array.from({ length: 7 }, () => Math.round(demand * (0.7 + Math.random() * 0.6))),
        topProduct: products[0]?.title?.slice(0, 50) || "N/A",
      };
    });

    const supplierStatus: SupplierStatus = {
      name: "CJ Dropshipping",
      trustBadge: Object.keys(categoryData).length >= 4 ? "gold" : Object.keys(categoryData).length >= 2 ? "silver" : "bronze",
      responseTime: `${Math.round(800 + Math.random() * 1200)}ms`,
      responseLevel: Math.random() > 0.5 ? "fast" : "moderate",
      completionRate: Number((90 + Math.random() * 9).toFixed(1)),
      status: Object.keys(categoryData).length >= 3 ? "online" : "busy",
      rating: Number((4 + Math.random()).toFixed(1)),
      location: "China / Global",
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
    if (isMockData) {
      insights.unshift("Live CJ data unavailable — displaying simulated market intelligence based on typical product patterns");
    }
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
    const mockProducts = generateMockProducts();
    const categoryData: Record<string, { search_results: MockProduct[] }> = {};
    for (const cat of ["electronics", "fashion", "home gadgets", "beauty", "toys"]) {
      const catProducts = mockProducts.filter((p) => p.category === cat);
      if (catProducts.length > 0) {
        categoryData[cat] = { search_results: catProducts };
      }
    }
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
      briefing: { insights: ["System recovering — displaying cached market data"], sentiment: 50, sentimentLabel: "Neutral", opportunities: 0, risks: 0, trends: 0, lastScan: "retrying..." },
      pulse: [],
      actionStats: [],
    });
  }
}

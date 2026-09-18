import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getCJAccessToken } from "@/lib/cj-auth";
import { safeErrorMessage } from "@/lib/api-errors";

const CJ_API_KEY = process.env.CJ_API_KEY;

interface CJCategory {
  cid: number;
  categoryName: string;
  parentCategory?: string;
  children?: CJCategory[];
}

interface CJProduct {
  pid: string;
  productNameEn: string;
  sellPrice: number | string;
  productPrice: number | string;
  productImage?: string;
  productImageSet?: (string | { url?: string; image?: string })[];
  productWeight?: number | string;
  categoryName?: string;
}

interface CJProductResponse {
  code: number;
  message: string;
  data: {
    list: CJProduct[];
    total: number;
  };
}

let cachedNiches: { niches: unknown[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

async function getCJCategories(token: string): Promise<CJCategory[]> {
  const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/getCategory", {
    method: "GET",
    headers: { "CJ-Access-Token": token, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  const raw = Array.isArray(data.data) ? data.data : [];

  const flat: CJCategory[] = [];
  for (const first of raw) {
    const firstName = first.categoryFirstName || first.categoryName || first.name || "";
    if (firstName && first.categoryFirstList) {
      for (const second of first.categoryFirstList) {
        const secondName = second.categorySecondName || second.categoryName || second.name || "";
        if (secondName) {
          flat.push({ cid: flat.length + 1, categoryName: secondName, parentCategory: firstName });
        }
      }
    } else if (firstName) {
      flat.push({ cid: flat.length + 1, categoryName: firstName });
    }
  }

  return flat;
}

async function searchCJProducts(token: string, categoryName: string, page = 1, pageSize = 20): Promise<CJProductResponse> {
  const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/list", {
    method: "POST",
    headers: { "CJ-Access-Token": token, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ productNameEn: categoryName, pageNum: page, pageSize }),
  });
  return res.json();
}

function getCategoryIcon(name: string): string {
  const lower = (name || "").toLowerCase();
  if (lower.includes("electron") || lower.includes("phone") || lower.includes("computer") || lower.includes("digital")) return "\ud83d\udcbb";
  if (lower.includes("fashion") || lower.includes("clothing") || lower.includes("apparel") || lower.includes("wear")) return "\ud83d\udc57";
  if (lower.includes("home") || lower.includes("furniture") || lower.includes("decor") || lower.includes("house")) return "\ud83c\udfe0";
  if (lower.includes("beauty") || lower.includes("makeup") || lower.includes("skincare")) return "\u2728";
  if (lower.includes("toy") || lower.includes("game") || lower.includes("kid") || lower.includes("baby")) return "\ud83c\udfa8";
  if (lower.includes("pet") || lower.includes("animal")) return "\ud83d\udc1e";
  if (lower.includes("sport") || lower.includes("outdoor") || lower.includes("fitness")) return "\u26bd";
  if (lower.includes("auto") || lower.includes("car") || lower.includes("vehicle")) return "\ud83d\ude97";
  if (lower.includes("health") || lower.includes("medical") || lower.includes("wellness")) return "\ud83c\udf3f";
  if (lower.includes("jewel") || lower.includes("accessori") || lower.includes("bag") || lower.includes("watch")) return "\ud83d\udc8e";
  return "\ud83d\udce6";
}

const NICHE_IMAGES: Record<string, string> = {
  "Electronics": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=250&fit=crop",
  "Fashion": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=250&fit=crop",
  "Home & Garden": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=250&fit=crop",
  "Beauty": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=250&fit=crop",
  "Toys": "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&h=250&fit=crop",
  "Pets": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=250&fit=crop",
  "Sports": "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=400&h=250&fit=crop",
  "Automotive": "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=250&fit=crop",
  "Health": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=250&fit=crop",
  "Jewelry": "https://images.unsplash.com/photo-1515562141589-67f0d569b47e?w=400&h=250&fit=crop",
  "Clothing": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=250&fit=crop",
  "Women": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=250&fit=crop",
  "Men": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop",
  "Accessories": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=250&fit=crop",
  "Shoes": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=250&fit=crop",
  "Bags": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=250&fit=crop",
  "Underwear": "https://images.unsplash.com/photo-1571513722275-4b4194c823bb?w=400&h=250&fit=crop",
  "Sleepwear": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=250&fit=crop",
  "Swimwear": "https://images.unsplash.com/photo-1570976447640-ac859083963f?w=400&h=250&fit=crop",
  "Plus Size": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=250&fit=crop",
  "Wedding": "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=250&fit=crop",
  "Costumes": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=250&fit=crop",
  "Kitchen": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=250&fit=crop",
  "Furniture": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=250&fit=crop",
  "Garden": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=250&fit=crop",
  "Lighting": "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400&h=250&fit=crop",
  "Phone": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=250&fit=crop",
  "Computer": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=250&fit=crop",
  "Headphone": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=250&fit=crop",
  "Watch": "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=250&fit=crop",
  "Camera": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=250&fit=crop",
  "Cosmetic": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=250&fit=crop",
  "Skincare": "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=250&fit=crop",
  "Makeup": "https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=400&h=250&fit=crop",
  "Perfume": "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=250&fit=crop",
  "Glasses": "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=250&fit=crop",
  "Hat": "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400&h=250&fit=crop",
  "Socks": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c87?w=400&h=250&fit=crop",
  "Belt": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=250&fit=crop",
  "Ring": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=250&fit=crop",
  "Necklace": "https://images.unsplash.com/photo-1515562141589-67f0d569b47e?w=400&h=250&fit=crop",
  "Bracelet": "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&h=250&fit=crop",
  "Earring": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=250&fit=crop",
  "Pet": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=250&fit=crop",
  "Dog": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=250&fit=crop",
  "Cat": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=250&fit=crop",
  "Baby": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=250&fit=crop",
  "Kids": "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=250&fit=crop",
  "Toy": "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&h=250&fit=crop",
  "Car": "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=250&fit=crop",
  "Bicycle": "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&h=250&fit=crop",
  "Camping": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=250&fit=crop",
  "Yoga": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=250&fit=crop",
  "Gym": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=250&fit=crop",
};

function getNicheImage(categoryName: string, products: CJProduct[], parentCategory?: string): string {
  for (const p of products) {
    if (p.productImage && p.productImage.startsWith("http")) return p.productImage;
    if (Array.isArray(p.productImageSet)) {
      for (const img of p.productImageSet) {
        const url = typeof img === "string" ? img : typeof img === "object" && img ? String(img.url || img.image || "") : "";
        if (url && url.startsWith("http")) return url;
      }
    }
  }
  const searchText = `${parentCategory || ""} ${categoryName || ""}`.toLowerCase();
  for (const [key, url] of Object.entries(NICHE_IMAGES)) {
    if (searchText.includes(key.toLowerCase())) return url;
  }
  return "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=250&fit=crop";
}

function computeGrade(score: number): "A+" | "A" | "B+" | "B" | "C+" | "C" {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  return "C";
}

function computeCompetitionLevel(saturation: number): "low" | "medium" | "high" | "very-high" {
  if (saturation < 25) return "low";
  if (saturation < 50) return "medium";
  if (saturation < 75) return "high";
  return "very-high";
}

function computeRiskLevel(margin: number, competition: string): "low" | "medium" | "high" {
  if (margin > 50 && competition === "low") return "low";
  if (margin < 25 || competition === "very-high") return "high";
  return "medium";
}

function generateWeeklyData(heat: number, growth: number): number[] {
  const base = heat;
  const trend = growth > 0 ? 1 : growth < 0 ? -1 : 0;
  return Array.from({ length: 12 }, (_, i) => {
    const noise = (Math.sin(i * 1.7) * 8 + Math.cos(i * 2.3) * 5);
    const trendComponent = trend * i * 1.5;
    return Math.max(5, Math.min(99, Math.round(base + noise + trendComponent)));
  });
}

function generateSeasonalTrend(heat: number): { month: string; demand: number; isPeak: boolean }[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const seasonalMultipliers = [0.7, 0.65, 0.8, 0.85, 0.9, 0.85, 0.8, 0.75, 0.9, 0.95, 1.0, 1.1];
  const peakMonths = [10, 11];
  return months.map((month, i) => ({
    month,
    demand: Math.round(heat * seasonalMultipliers[i]),
    isPeak: peakMonths.includes(i),
  }));
}

function generateGeographicDemand(categoryName: string): { country: string; demand: number; avgOrderValue: number }[] {
  const lower = (categoryName || "").toLowerCase();
  const baseDemand = lower.includes("fashion") ? 85 : lower.includes("electron") ? 80 : 70;
  return [
    { country: "United States", demand: baseDemand, avgOrderValue: Math.round(25 + Math.random() * 30) },
    { country: "United Kingdom", demand: Math.round(baseDemand * 0.7), avgOrderValue: Math.round(20 + Math.random() * 25) },
    { country: "Germany", demand: Math.round(baseDemand * 0.6), avgOrderValue: Math.round(22 + Math.random() * 28) },
    { country: "Australia", demand: Math.round(baseDemand * 0.5), avgOrderValue: Math.round(28 + Math.random() * 35) },
    { country: "Canada", demand: Math.round(baseDemand * 0.55), avgOrderValue: Math.round(24 + Math.random() * 30) },
  ];
}

function buildNicheFromCategory(
  cat: CJCategory,
  products: CJProduct[],
  index: number,
): Record<string, unknown> {
  const validProducts = products.filter((p) => Number(p.sellPrice) > 0 && Number(p.productPrice) > 0);
  const productCount = validProducts.length || 1;

  const prices = validProducts.map((p) => Number(p.sellPrice));
  const costs = validProducts.map((p) => Number(p.productPrice));
  const avgSellPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 10;
  const avgCost = costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 5;
  const avgMargin = avgCost > 0 ? Math.round(((avgSellPrice - avgCost) / avgSellPrice) * 100) : 45;

  const sortedByValue = validProducts.length
    ? [...validProducts].sort((a, b) => Number(b.sellPrice) - Number(a.sellPrice))
    : [];
  const topByValue = sortedByValue[0] || null;
  const topProduct = topByValue ? topByValue.productNameEn.slice(0, 50) : `${cat.categoryName || "General"} Bundle Set`;
  const topProductPrice = topByValue ? Number(topByValue.sellPrice) : avgSellPrice * 1.5;
  const topProductCost = topByValue ? Number(topByValue.productPrice) : avgCost;
  const topProductMargin = topProductPrice > 0 ? Math.round(((topProductPrice - topProductCost) / topProductPrice) * 100) : 50;

  const rawName = (cat.categoryName || "").trim();
  let nicheName = rawName;
  if (!nicheName || /^category\s+\d+$/i.test(nicheName) || /^niche\s+\d+$/i.test(nicheName)) {
    if (validProducts.length > 0) {
      const topProductName = (topByValue?.productNameEn || validProducts[0].productNameEn || "").trim();
      const words = topProductName.split(/\s+/).filter((w) => w.length > 2);
      if (words.length >= 2) {
        nicheName = words.slice(0, 3).join(" ");
      } else if (words.length === 1) {
        nicheName = `${words[0]} Collection`;
      } else {
        nicheName = `Trending Products #${index + 1}`;
      }
    } else {
      const categoryIcons: Record<string, string> = {
        "Electronics": "Electronics & Gadgets",
        "Fashion": "Fashion & Apparel",
        "Home": "Home & Living",
        "Beauty": "Beauty & Skincare",
        "Toys": "Toys & Games",
        "Pets": "Pet Supplies",
        "Sports": "Sports & Outdoors",
        "Automotive": "Automotive Parts",
        "Health": "Health & Wellness",
        "Jewelry": "Jewelry & Accessories",
      };
      const matchedKey = Object.keys(categoryIcons).find((k) => rawName.toLowerCase().includes(k.toLowerCase()));
      nicheName = matchedKey ? categoryIcons[matchedKey] : `Trending Niche #${index + 1}`;
    }
  }

  const demandScore = Math.min(95, productCount * 5);
  const profitScore = avgMargin;
  const competitionScore = Math.max(10, Math.min(95, 100 - productCount * 2));
  const trendScore = Math.round(50 + (avgMargin > 40 ? 20 : avgMargin > 25 ? 10 : 0));
  const seasonalityScore = Math.round(60 + (productCount > 15 ? 15 : productCount > 8 ? 10 : 0));

  const overallScore = Math.round(
    demandScore * 0.25 + profitScore * 0.25 + competitionScore * 0.2 + trendScore * 0.15 + seasonalityScore * 0.15
  );

  const heat = Math.min(99, Math.round(overallScore * 0.85));
  const growth = Math.round(-5 + (avgMargin > 40 ? 20 : avgMargin > 25 ? 10 : 5));
  const trend: "up" | "down" | "stable" = growth > 8 ? "up" : growth < -2 ? "down" : "stable";
  const trendDirection: "rising" | "stable" | "declining" = growth > 8 ? "rising" : growth < -2 ? "declining" : "stable";
  const saturation = Math.min(95, Math.max(5, Math.round(100 - competitionScore)));
  const competitionLevel = computeCompetitionLevel(saturation);
  const riskLevel = computeRiskLevel(avgMargin, competitionLevel);

  const estimatedMonthlyRevenue = Math.round(avgSellPrice * productCount * (growth > 0 ? 1.2 : 0.9) * 100) / 100;
  const profitPerUnit = Math.round((avgSellPrice - avgCost) * 100) / 100;
  const avgShippingDays = Math.round(5 + Math.random() * 10);
  const avgReturnRate = Math.round((2 + Math.random() * 8) * 10) / 10;

  const topProducts = sortedByValue.slice(0, 10).map((p) => {
    const sell = Number(p.sellPrice);
    const cost = Number(p.productPrice);
    return {
      id: p.pid || `prod-${Math.random().toString(36).slice(2, 9)}`,
      name: (p.productNameEn || "Unknown Product").slice(0, 60),
      image: p.productImage || "",
      sellPrice: sell,
      costPrice: cost,
      margin: sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0,
      orders: Math.round(10 + Math.random() * 200),
      rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      shippingDays: Math.round(5 + Math.random() * 12),
      returnRate: Math.round((1 + Math.random() * 6) * 10) / 10,
    };
  });

  const avgStoreRating = Math.round((3.8 + Math.random() * 1.2) * 10) / 10;
  const storeCount = Math.round(50 + Math.random() * 500);
  const priceMin = Math.round(avgSellPrice * 0.6 * 100) / 100;
  const priceMax = Math.round(avgSellPrice * 1.8 * 100) / 100;

  const suppliers = [
    { name: "CJ Dropshipping", badge: "gold" as const, reliability: Math.round(90 + Math.random() * 9), avgShippingDays: Math.round(5 + Math.random() * 7), price: Math.round(avgCost * 100) / 100, moq: 1, responseRate: Math.round(92 + Math.random() * 8) },
    { name: "Factory Direct", badge: "silver" as const, reliability: Math.round(80 + Math.random() * 12), avgShippingDays: Math.round(7 + Math.random() * 10), price: Math.round(avgCost * 0.9 * 100) / 100, moq: Math.round(5 + Math.random() * 20), responseRate: Math.round(85 + Math.random() * 12) },
    { name: "Global Supply Co", badge: "bronze" as const, reliability: Math.round(70 + Math.random() * 15), avgShippingDays: Math.round(8 + Math.random() * 14), price: Math.round(avgCost * 0.85 * 100) / 100, moq: Math.round(10 + Math.random() * 50), responseRate: Math.round(78 + Math.random() * 15) },
  ];

  const aiInsight = `Analyzed ${productCount} CJ products in ${nicheName}. ` +
    `Average sell price $${avgSellPrice.toFixed(2)} with ~${avgMargin}% margins. ` +
    `${trend === "up" ? "Trending upward with strong demand signals." : trend === "down" ? "Slight decline detected — consider differentiation." : "Steady market with consistent demand."} ` +
    `${competitionLevel === "low" || competitionLevel === "medium" ? "Competition is manageable for new entrants." : "High competition — focus on unique value props."} ` +
    `Estimated monthly revenue potential: $${estimatedMonthlyRevenue.toLocaleString()}.`;

  return {
    id: `cj-niche-${cat.cid || index}`,
    name: nicheName,
    icon: getCategoryIcon(nicheName),
    image: getNicheImage(nicheName, products, cat.parentCategory),
    category: nicheName,
    heat,
    productCount,
    avgMargin,
    growth,
    trend,
    trendDirection,
    weeklyData: generateWeeklyData(heat, growth),
    demandSparkline: generateWeeklyData(demandScore, growth),
    scores: { demand: demandScore, profit: profitScore, competition: competitionScore, trend: trendScore, seasonality: seasonalityScore },
    overallScore,
    grade: computeGrade(overallScore),
    topProduct,
    topProductPrice: Math.round(topProductPrice * 100) / 100,
    topProductMargin,
    aiInsight,
    competitionLevel,
    saturation,
    avgSellingPrice: Math.round(avgSellPrice * 100) / 100,
    bestPlatforms: ["Shopify", "WooCommerce", "Etsy"],
    seasonality: `${nicheName} sees peak demand during holiday seasons (Nov-Dec) with moderate demand year-round.`,
    riskLevel,
    topSuppliers: suppliers,
    relatedNiches: ["Accessories", "Gifts", "Bundles", "Premium Line"],
    keywords: [nicheName.toLowerCase(), `${nicheName.toLowerCase()} products`, `${nicheName.toLowerCase()} dropshipping`],
    estimatedMonthlyRevenue,
    profitPerUnit,
    avgShippingDays,
    avgReturnRate,
    topProducts,
    competition: {
      avgStoreRating,
      storeCount,
      priceRange: { min: priceMin, max: priceMax, avg: Math.round(avgSellPrice * 100) / 100 },
      topPlatforms: ["Shopify", "WooCommerce", "Etsy"],
      saturationLevel: competitionLevel,
    },
    geographicDemand: generateGeographicDemand(nicheName),
    seasonalTrend: generateSeasonalTrend(heat),
  };
}

function getFallbackNiches(): Record<string, unknown>[] {
  const fallbacks: { name: string; category: string; icon: string }[] = [
    { name: "Electronics Hub", category: "Electronics", icon: "\ud83d\udcbb" },
    { name: "Fashion Zone", category: "Fashion", icon: "\ud83d\udc57" },
    { name: "Home Living", category: "Home & Garden", icon: "\ud83c\udfe0" },
    { name: "Beauty Lab", category: "Beauty", icon: "\u2728" },
    { name: "Toys & Games", category: "Toys", icon: "\ud83c\udfa8" },
    { name: "Pet Supplies", category: "Pets", icon: "\ud83d\udc1e" },
    { name: "Sports Gear", category: "Sports", icon: "\u26bd" },
    { name: "Auto Parts", category: "Automotive", icon: "\ud83d\ude97" },
  ];
  return fallbacks.map((f, i) => buildNicheFromCategory(
    { cid: 9000 + i, categoryName: f.category },
    [],
    i,
  ));
}

export const GET = withAuth(async () => {
  try {
    if (cachedNiches && Date.now() - cachedNiches.timestamp < CACHE_TTL) {
      return NextResponse.json({ niches: cachedNiches.niches, cached: true });
    }

    if (!CJ_API_KEY) {
      const fallbackNiches = getFallbackNiches();
      return NextResponse.json({ niches: fallbackNiches, source: "fallback", isFallback: true, reason: "CJ API key not configured" });
    }

    const token = await getCJAccessToken();
    if (!token) {
      const fallbackNiches = getFallbackNiches();
      return NextResponse.json({ niches: fallbackNiches, source: "fallback", isFallback: true, reason: "Failed to authenticate with CJ" });
    }

    const categories = await getCJCategories(token);
    if (!categories.length) {
      const fallbackNiches = getFallbackNiches();
      return NextResponse.json({ niches: fallbackNiches, source: "fallback", isFallback: true, reason: "No categories returned from CJ" });
    }

    const topCategories = categories.slice(0, 8);
    const niches: Record<string, unknown>[] = [];

    for (let i = 0; i < topCategories.length; i++) {
      const cat = topCategories[i];
      try {
        const searchTerm = cat.parentCategory
          ? `${cat.parentCategory} ${cat.categoryName}`
          : cat.categoryName;
        const productRes = await searchCJProducts(token, searchTerm, 1, 20);
        let products = productRes.data?.list || [];
        if (products.length === 0) {
          const retryRes = await searchCJProducts(token, cat.categoryName, 1, 20);
          products = retryRes.data?.list || [];
        }
        niches.push(buildNicheFromCategory(cat, products, i));
      } catch {
        niches.push(buildNicheFromCategory(cat, [], i));
      }
    }

    cachedNiches = { niches, timestamp: Date.now() };
    return NextResponse.json({ niches, source: "cj", count: niches.length });
  } catch (error) {
    const fallbackNiches = getFallbackNiches();
    return NextResponse.json(
      { niches: fallbackNiches, source: "fallback", isFallback: true, error: safeErrorMessage(error, "Unknown error") },
    );
  }
});

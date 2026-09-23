import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getCJAccessToken } from "@/lib/cj-auth";
import { safeErrorMessage } from "@/lib/api-errors";
import { getFeedCache, setFeedCache } from "@/lib/feed-cache";

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

const CACHE_NAMESPACE = "discovery-feed";
const CACHE_TTL_SECONDS = 30 * 60;

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

const DEFAULT_NICHE_IMAGE = "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=250&fit=crop";

function collectProductImageUrls(products: CJProduct[]): string[] {
  const urls: string[] = [];
  for (const p of products) {
    if (p.productImage && p.productImage.startsWith("http")) urls.push(p.productImage);
    if (Array.isArray(p.productImageSet)) {
      for (const img of p.productImageSet) {
        const url = typeof img === "string" ? img : img && typeof img === "object" ? String(img.url || img.image || "") : "";
        if (url && url.startsWith("http")) urls.push(url);
      }
    }
  }
  return urls;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getNicheImage(
  categoryName: string,
  products: CJProduct[],
  parentCategory?: string,
  usedImages?: Set<string>,
): string {
  const isUnused = (url: string) => !usedImages || !usedImages.has(url);

  // Prefer real product images, skipping any URL already used by another niche
  for (const url of collectProductImageUrls(products)) {
    if (isUnused(url)) return url;
  }

  // Thematic stock image matching the category keywords
  const searchText = `${parentCategory || ""} ${categoryName || ""}`.toLowerCase();
  const keywordMatches: string[] = [];
  for (const [key, url] of Object.entries(NICHE_IMAGES)) {
    if (searchText.includes(key.toLowerCase()) && !keywordMatches.includes(url)) {
      keywordMatches.push(url);
    }
  }
  for (const url of keywordMatches) {
    if (isUnused(url)) return url;
  }

  // Deterministic rotation through the stock pool so no two niches repeat
  const pool = Array.from(new Set(Object.values(NICHE_IMAGES)));
  const start = hashString(`${categoryName}|${parentCategory || ""}`) % pool.length;
  for (let i = 0; i < pool.length; i++) {
    const url = pool[(start + i) % pool.length];
    if (isUnused(url)) return url;
  }

  return keywordMatches[0] || DEFAULT_NICHE_IMAGE;
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

// Deterministic pseudo-random source so synthetic companion stats (store
// counts, ratings, shipping windows) are stable across requests. Seeded by
// niche identity instead of using Math.random().
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0 || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randIn(rng: () => number, min: number, max: number): number {
  return Math.round(min + rng() * (max - min));
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
  const rng = seededRandom(`geo-${categoryName}`);
  return [
    { country: "United States", demand: baseDemand, avgOrderValue: randIn(rng, 25, 55) },
    { country: "United Kingdom", demand: Math.round(baseDemand * 0.7), avgOrderValue: randIn(rng, 20, 45) },
    { country: "Germany", demand: Math.round(baseDemand * 0.6), avgOrderValue: randIn(rng, 22, 50) },
    { country: "Australia", demand: Math.round(baseDemand * 0.5), avgOrderValue: randIn(rng, 28, 63) },
    { country: "Canada", demand: Math.round(baseDemand * 0.55), avgOrderValue: randIn(rng, 24, 54) },
  ];
}

function buildNicheFromCategory(
  cat: CJCategory,
  products: CJProduct[],
  index: number,
  usedImages?: Set<string>,
): Record<string, unknown> {
  const validProducts = products.filter((p) => Number(p.sellPrice) > 0 && Number(p.productPrice) > 0);
  const productCount = validProducts.length || 1;

  const prices = validProducts.map((p) => Number(p.sellPrice));
  const costs = validProducts.map((p) => Number(p.productPrice));
  const avgSellPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 10;
  const avgCost = costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 5;
  const avgMargin = avgCost > 0 ? Math.round(((avgSellPrice - avgCost) / avgSellPrice) * 100) : 45;

  // Deterministic seed derived from the category so stats stay stable
  const rng = seededRandom(`${cat.cid ?? index}-${cat.categoryName ?? ""}-${productCount}`);

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
  const avgShippingDays = randIn(rng, 5, 15);
  const avgReturnRate = randIn(rng, 2, 10) / 10;

  const topProducts = sortedByValue.slice(0, 10).map((p) => {
    const sell = Number(p.sellPrice);
    const cost = Number(p.productPrice);
    return {
      id: p.pid || `prod-${seededRandom(`${cat.cid ?? index}-${p.productNameEn}`)().toString(36).slice(2, 10)}`,
      name: (p.productNameEn || "Unknown Product").slice(0, 60),
      image: p.productImage || "",
      sellPrice: sell,
      costPrice: cost,
      margin: sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0,
      orders: randIn(rng, 10, 210),
      rating: Math.round((3.5 + rng() * 1.5) * 10) / 10,
      shippingDays: randIn(rng, 5, 17),
      returnRate: randIn(rng, 1, 7) / 10,
    };
  });

  const avgStoreRating = Math.round((3.8 + rng() * 1.2) * 10) / 10;
  const storeCount = randIn(rng, 50, 550);
  const priceMin = Math.round(avgSellPrice * 0.6 * 100) / 100;
  const priceMax = Math.round(avgSellPrice * 1.8 * 100) / 100;

  const suppliers = [
    { name: "CJ Dropshipping", badge: "gold" as const, reliability: randIn(rng, 90, 99), avgShippingDays: randIn(rng, 5, 12), price: Math.round(avgCost * 100) / 100, moq: 1, responseRate: randIn(rng, 92, 100) },
    { name: "Factory Direct", badge: "silver" as const, reliability: randIn(rng, 80, 92), avgShippingDays: randIn(rng, 7, 17), price: Math.round(avgCost * 0.9 * 100) / 100, moq: randIn(rng, 5, 25), responseRate: randIn(rng, 85, 97) },
    { name: "Global Supply Co", badge: "bronze" as const, reliability: randIn(rng, 70, 85), avgShippingDays: randIn(rng, 8, 22), price: Math.round(avgCost * 0.85 * 100) / 100, moq: randIn(rng, 10, 60), responseRate: randIn(rng, 78, 93) },
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
    image: getNicheImage(nicheName, products, cat.parentCategory, usedImages),
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
  const usedImages = new Set<string>();
  return fallbacks.map((f, i) => {
    const niche = buildNicheFromCategory({ cid: 9000 + i, categoryName: f.category }, [], i, usedImages);
    if (typeof niche.image === "string" && niche.image) usedImages.add(niche.image);
    return niche;
  });
}

export const GET = withAuth(async () => {
  try {
    const cachedNiches = await getFeedCache<Record<string, unknown>[]>(CACHE_NAMESPACE, "niches-v2", CACHE_TTL_SECONDS);
    if (cachedNiches && cachedNiches.length > 0) {
      return NextResponse.json({ niches: cachedNiches, cached: true });
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
    const usedImages = new Set<string>();

    for (let i = 0; i < topCategories.length; i++) {
      const cat = topCategories[i];
      let niche: Record<string, unknown>;
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
        niche = buildNicheFromCategory(cat, products, i, usedImages);
      } catch {
        niche = buildNicheFromCategory(cat, [], i, usedImages);
      }
      if (typeof niche.image === "string" && niche.image) usedImages.add(niche.image);
      niches.push(niche);
    }

    await setFeedCache(CACHE_NAMESPACE, "niches-v2", niches, CACHE_TTL_SECONDS);
    return NextResponse.json({ niches, source: "cj", count: niches.length });
  } catch (error) {
    const fallbackNiches = getFallbackNiches();
    return NextResponse.json(
      { niches: fallbackNiches, source: "fallback", isFallback: true, error: safeErrorMessage(error, "Unknown error") },
    );
  }
});

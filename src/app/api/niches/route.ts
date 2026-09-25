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
  "Kitchen": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=250&fit=crop",
  "Furniture": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=250&fit=crop",
  "Garden": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=250&fit=crop",
  "Pet": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=250&fit=crop",
  "Dog": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=250&fit=crop",
  "Cat": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=250&fit=crop",
  "Baby": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=250&fit=crop",
  "Kids": "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=250&fit=crop",
  "Toy": "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&h=250&fit=crop",
  "Car": "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=250&fit=crop",
  "Phone": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=250&fit=crop",
  "Computer": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=250&fit=crop",
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

  for (const url of collectProductImageUrls(products)) {
    if (isUnused(url)) return url;
  }

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

function computeRiskLevel(margin: number | null, competition: string): "low" | "medium" | "high" {
  if (margin != null && margin > 50 && competition === "low") return "low";
  if (margin == null || margin < 25 || competition === "very-high") return margin == null ? "medium" : "high";
  return "medium";
}

/**
 * Build a niche card from real CJ product prices only.
 * No seededRandom companions (store counts, ratings, shipping, geo, seasonal)
 * and no fabricated growth %.
 */
function buildNicheFromCategory(
  cat: CJCategory,
  products: CJProduct[],
  index: number,
  usedImages?: Set<string>,
): Record<string, unknown> {
  const validProducts = products.filter((p) => Number(p.sellPrice) > 0 && Number(p.productPrice) > 0);
  const productCount = validProducts.length;

  const prices = validProducts.map((p) => Number(p.sellPrice));
  const costs = validProducts.map((p) => Number(p.productPrice));
  const avgSellPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  const avgCost = costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : null;
  const avgMargin =
    avgSellPrice != null && avgCost != null && avgSellPrice > 0
      ? Math.round(((avgSellPrice - avgCost) / avgSellPrice) * 100)
      : null;

  const sortedByValue = [...validProducts].sort((a, b) => Number(b.sellPrice) - Number(a.sellPrice));
  const topByValue = sortedByValue[0] || null;
  const topProduct = topByValue
    ? topByValue.productNameEn.slice(0, 50)
    : `${cat.categoryName || "Category"} (no products loaded)`;
  const topProductPrice = topByValue ? Number(topByValue.sellPrice) : null;
  const topProductCost = topByValue ? Number(topByValue.productPrice) : null;
  const topProductMargin =
    topProductPrice != null && topProductCost != null && topProductPrice > 0
      ? Math.round(((topProductPrice - topProductCost) / topProductPrice) * 100)
      : null;

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
        nicheName = `Category #${index + 1}`;
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
      nicheName = matchedKey ? categoryIcons[matchedKey] : rawName || `Category #${index + 1}`;
    }
  }

  // Heuristic scores from real product counts/prices only (labeled Estimated in UI).
  const demandScore = Math.min(95, productCount * 5);
  const profitScore = avgMargin ?? 50;
  const competitionScore = Math.max(10, Math.min(95, 100 - productCount * 2));
  const trendScore = 50;
  const seasonalityScore = Math.round(60 + (productCount > 15 ? 15 : productCount > 8 ? 10 : 0));

  const overallScore = Math.round(
    demandScore * 0.25 + profitScore * 0.25 + competitionScore * 0.2 + trendScore * 0.15 + seasonalityScore * 0.15
  );

  const heat = Math.min(99, Math.round(overallScore * 0.85));
  const saturation = Math.min(95, Math.max(5, Math.round(100 - competitionScore)));
  const competitionLevel = computeCompetitionLevel(saturation);
  const riskLevel = computeRiskLevel(avgMargin, competitionLevel);

  const profitPerUnit =
    avgSellPrice != null && avgCost != null ? Math.round((avgSellPrice - avgCost) * 100) / 100 : null;

  const topProducts = sortedByValue.slice(0, 10).map((p) => {
    const sell = Number(p.sellPrice);
    const cost = Number(p.productPrice);
    return {
      id: p.pid || `prod-${hashString(p.productNameEn || "").toString(36)}`,
      name: (p.productNameEn || "Unknown Product").slice(0, 60),
      image: p.productImage || "",
      sellPrice: sell,
      costPrice: cost,
      margin: sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0,
      orders: null,
      rating: null,
      shippingDays: null,
      returnRate: null,
    };
  });

  const priceMin = avgSellPrice != null ? Math.round(avgSellPrice * 0.6 * 100) / 100 : null;
  const priceMax = avgSellPrice != null ? Math.round(avgSellPrice * 1.8 * 100) / 100 : null;

  const aiInsight =
    productCount > 0
      ? `Loaded ${productCount} live CJ products in ${nicheName}. ` +
        (avgSellPrice != null ? `Average sell price $${avgSellPrice.toFixed(2)}. ` : "") +
        (avgMargin != null ? `Average supplier margin ~${avgMargin}% (from CJ cost vs sell price). ` : "") +
        `Growth %, store counts, and shipping windows need market APIs not connected yet.`
      : `No CJ products returned for ${nicheName}. Configure CJ_API_KEY and retry to load live catalog data.`;

  return {
    id: `cj-niche-${cat.cid || index}`,
    name: nicheName,
    icon: getCategoryIcon(nicheName),
    image: getNicheImage(nicheName, products, cat.parentCategory, usedImages),
    category: nicheName,
    heat,
    productCount,
    avgMargin,
    growth: null,
    trend: null,
    trendDirection: null,
    weeklyData: [],
    demandSparkline: [],
    scores: { demand: demandScore, profit: profitScore, competition: competitionScore, trend: trendScore, seasonality: seasonalityScore },
    overallScore,
    grade: computeGrade(overallScore),
    topProduct,
    topProductPrice,
    topProductMargin,
    aiInsight,
    competitionLevel,
    saturation,
    avgSellingPrice: avgSellPrice != null ? Math.round(avgSellPrice * 100) / 100 : null,
    bestPlatforms: ["Shopify", "WooCommerce", "Etsy"],
    seasonality: null,
    riskLevel,
    topSuppliers: [],
    relatedNiches: [],
    keywords: [nicheName.toLowerCase(), `${nicheName.toLowerCase()} products`, `${nicheName.toLowerCase()} dropshipping`],
    estimatedMonthlyRevenue: null,
    profitPerUnit,
    avgShippingDays: null,
    avgReturnRate: null,
    topProducts,
    competition: {
      avgStoreRating: null,
      storeCount: null,
      priceRange:
        priceMin != null && priceMax != null && avgSellPrice != null
          ? { min: priceMin, max: priceMax, avg: Math.round(avgSellPrice * 100) / 100 }
          : null,
      topPlatforms: ["Shopify", "WooCommerce", "Etsy"],
      saturationLevel: competitionLevel,
    },
    geographicDemand: [],
    seasonalTrend: [],
    isFallback: false,
  };
}

export const GET = withAuth(async () => {
  try {
    const cachedNiches = await getFeedCache<Record<string, unknown>[]>(CACHE_NAMESPACE, "niches-v3", CACHE_TTL_SECONDS);
    if (cachedNiches && cachedNiches.length > 0) {
      return NextResponse.json({ niches: cachedNiches, cached: true, isFallback: false, source: "cj" });
    }

    if (!CJ_API_KEY) {
      return NextResponse.json({
        niches: [],
        source: "fallback",
        isFallback: true,
        reason: "CJ API key not configured",
        setup: {
          what: "CJ Dropshipping API key",
          whereToGet: "https://developers.cjdropshipping.com/",
          whereToSet: "CJ_API_KEY",
        },
      });
    }

    const token = await getCJAccessToken();
    if (!token) {
      return NextResponse.json({
        niches: [],
        source: "fallback",
        isFallback: true,
        reason: "Failed to authenticate with CJ",
        setup: {
          what: "Valid CJ access token / CJ_API_KEY credentials",
          whereToGet: "https://developers.cjdropshipping.com/",
          whereToSet: "CJ_API_KEY",
        },
      });
    }

    const categories = await getCJCategories(token);
    if (!categories.length) {
      return NextResponse.json({
        niches: [],
        source: "fallback",
        isFallback: true,
        reason: "No categories returned from CJ",
        setup: {
          what: "CJ category catalog access",
          whereToGet: "https://developers.cjdropshipping.com/",
          whereToSet: "CJ_API_KEY",
        },
      });
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

    await setFeedCache(CACHE_NAMESPACE, "niches-v3", niches, CACHE_TTL_SECONDS);
    return NextResponse.json({ niches, source: "cj", count: niches.length, isFallback: false });
  } catch (error) {
    return NextResponse.json(
      {
        niches: [],
        source: "fallback",
        isFallback: true,
        error: safeErrorMessage(error, "Unknown error"),
        reason: "CJ request failed",
        setup: {
          what: "Working CJ API credentials",
          whereToGet: "https://developers.cjdropshipping.com/",
          whereToSet: "CJ_API_KEY",
        },
      },
    );
  }
});

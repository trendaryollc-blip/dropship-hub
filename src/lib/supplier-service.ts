import { SupplierProfile } from "@/types/supplier";
import { getCJAccessToken } from "@/lib/cj-auth";

async function fetchCJCategories(): Promise<string[]> {
  try {
    const accessToken = await getCJAccessToken();
    const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/getCategory", {
      method: "GET",
      headers: { "CJ-Access-Token": accessToken, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const cats = data.data || [];
    return cats.map((c: Record<string, unknown>) => String(c.categoryName || c.name || "")).filter(Boolean).slice(0, 20);
  } catch {
    return [];
  }
}

async function fetchCJProductSample(): Promise<{ count: number; avgPrice: number; categories: string[] }> {
  try {
    const accessToken = await getCJAccessToken();
    const queries = ["electronics", "fashion", "home", "beauty", "toys"];
    let totalProducts = 0;
    let totalPrice = 0;
    let productCount = 0;
    const categorySet = new Set<string>();

    for (const q of queries) {
      const res = await fetch(
        `https://developers.cjdropshipping.com/api2.0/v1/product/list?productNameEn=${encodeURIComponent(q)}&pageNum=1&pageSize=20`,
        { method: "GET", headers: { "CJ-Access-Token": accessToken, "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const items = data.data || [];
      totalProducts += items.length;
      for (const item of items) {
        const price = typeof item.sellPrice === "number" ? item.sellPrice : typeof item.productPrice === "number" ? item.productPrice : 0;
        if (price > 0) { totalPrice += price; productCount++; }
        if (item.categoryName) categorySet.add(String(item.categoryName));
      }
    }

    return {
      count: totalProducts,
      avgPrice: productCount > 0 ? totalPrice / productCount : 0,
      categories: Array.from(categorySet).slice(0, 15),
    };
  } catch {
    return { count: 0, avgPrice: 0, categories: [] };
  }
}

function buildCJSupplier(cjCategories: string[], cjProductData: { count: number; avgPrice: number; categories: string[] }): SupplierProfile {
  const allCategories = [...new Set([...cjCategories, ...cjProductData.categories])].slice(0, 15);
  return {
    id: "cj-dropshipping",
    name: "CJ Dropshipping",
    slug: "cj-dropshipping",
    location: "Yiwu, China",
    country: "China",
    flag: "\ud83c\udde8\ud83c\uddf3",
    description: "CJ Dropshipping is one of the largest dropshipping suppliers with warehouses in China, US, EU, and Southeast Asia. They offer product sourcing, custom packaging, quality inspection, and fast global shipping.",
    specializations: allCategories.length > 0 ? allCategories.slice(0, 6) : ["Electronics", "Fashion", "Home & Garden", "Beauty", "Toys"],
    trustBadge: "gold",
    dataSource: "live",
    stats: {
      reliabilityScore: 0,
      rating: 0,
      reviews: 0,
      responseTime: "Check with supplier",
      responseTimeHours: 0,
      shippingDays: 0,
      shippingDaysEU: 0,
      orderCompletionRate: 0,
      disputeRate: 0,
      monthlyOrders: 0,
      totalProducts: cjProductData.count || 0,
      yearEstablished: 2014,
      communicationScore: 0,
      qualityScore: 0,
      priceCompetitiveness: 0,
    },
    shipping: {
      methods: ["CJPacket", "ePacket", "DHL", "FedEx", "USPS (US Warehouse)"],
      processingTime: "1-3 days",
      freeShippingThreshold: null,
      packagingQuality: "standard",
    },
    quality: {
      inspection: "Free quality inspection available",
      returnPolicy: "30-day returns for quality issues",
      refundPolicy: "Full refund within 30 days",
      replacementPolicy: "Free replacement for defective items",
      disputeResolution: "24-48 hours",
      certifications: [],
    },
    catalog: {
      categories: allCategories.length > 0 ? allCategories : [],
      priceRange: cjProductData.avgPrice > 0 ? { min: Math.max(0.5, cjProductData.avgPrice * 0.3), max: cjProductData.avgPrice * 3 } : { min: 0, max: 0 },
      moq: 1,
      samplesAvailable: true,
      samplePrice: null,
    },
    communication: {
      methods: ["Live Chat", "Email", "Ticket System"],
      languages: ["English", "Chinese"],
      supportHours: "24/7",
    },
    source: "cj",
    sourceUrl: "https://cjdropshipping.com",
    lastUpdated: new Date().toISOString(),
  };
}

let cachedSuppliers: { data: SupplierProfile[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

export async function getSuppliers(): Promise<SupplierProfile[]> {
  if (cachedSuppliers && Date.now() - cachedSuppliers.timestamp < CACHE_TTL) {
    return cachedSuppliers.data;
  }

  const [cjCategories, cjProductData] = await Promise.all([
    fetchCJCategories(),
    fetchCJProductSample(),
  ]);

  const cjSupplier = buildCJSupplier(cjCategories, cjProductData);

  cachedSuppliers = { data: [cjSupplier], timestamp: Date.now() };
  return [cjSupplier];
}

export async function getSupplierById(id: string): Promise<SupplierProfile | null> {
  const suppliers = await getSuppliers();
  return suppliers.find((s) => s.id === id || s.slug === id) || null;
}

export async function searchSuppliers(query: string): Promise<SupplierProfile[]> {
  const suppliers = await getSuppliers();
  const q = query.toLowerCase();
  return suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.specializations.some((sp) => sp.toLowerCase().includes(q)) ||
      s.catalog.categories.some((c) => c.toLowerCase().includes(q)) ||
      s.location.toLowerCase().includes(q)
  );
}

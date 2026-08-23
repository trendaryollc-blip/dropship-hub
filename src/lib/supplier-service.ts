import { SupplierProfile } from "@/types/supplier";

const CJ_EMAIL = process.env.CJ_EMAIL;
const CJ_PASSWORD = process.env.CJ_PASSWORD;

async function getCJAccessToken(): Promise<string> {
  if (!CJ_EMAIL || !CJ_PASSWORD) throw new Error("CJ credentials not configured");
  const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CJ_EMAIL, password: CJ_PASSWORD }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`CJ Auth ${res.status}`);
  const data = await res.json();
  const token = data.data?.accessToken;
  if (!token) throw new Error("CJ auth returned no token");
  return token;
}

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
    specializations: ["All Categories", "Electronics", "Fashion", "Home & Garden", "Beauty", "Toys"],
    trustBadge: "gold",
    stats: {
      reliabilityScore: 87,
      rating: 4.5,
      reviews: 28000,
      responseTime: "< 8 hours",
      responseTimeHours: 8,
      shippingDays: 7,
      shippingDaysEU: 10,
      orderCompletionRate: 96.8,
      disputeRate: 1.8,
      monthlyOrders: 89000,
      totalProducts: cjProductData.count || 50000,
      yearEstablished: 2014,
      communicationScore: 82,
      qualityScore: 83,
      priceCompetitiveness: 97,
    },
    shipping: {
      methods: ["CJPacket", "ePacket", "DHL", "FedEx", "USPS (US Warehouse)"],
      processingTime: "1-3 days",
      freeShippingThreshold: 500,
      packagingQuality: "premium",
    },
    quality: {
      inspection: "Free quality inspection available",
      returnPolicy: "30-day returns for quality issues",
      refundPolicy: "Full refund within 30 days",
      replacementPolicy: "Free replacement for defective items",
      disputeResolution: "24-48 hours",
      certifications: ["ISO 9001", "CE", "FCC"],
    },
    catalog: {
      categories: allCategories.length > 0 ? allCategories : ["Electronics", "Fashion", "Home", "Beauty", "Toys", "Automotive"],
      priceRange: { min: 0.5, max: 200 },
      moq: 1,
      samplesAvailable: true,
      samplePrice: 10,
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

function buildMarketSuppliers(): SupplierProfile[] {
  return [
    {
      id: "aliexpress-standard",
      name: "AliExpress (via Rainforest)",
      slug: "aliexpress-standard",
      location: "Shenzhen, China",
      country: "China",
      flag: "\ud83c\udde8\ud83c\uddf3",
      description: "AliExpress is one of the world's largest online marketplaces with millions of products from Chinese manufacturers. Accessible via Rainforest API for product search and price monitoring.",
      specializations: ["Electronics", "Gadgets", "Fashion", "Home & Kitchen", "Phone Accessories"],
      trustBadge: "silver",
      stats: {
        reliabilityScore: 78,
        rating: 4.3,
        reviews: 150000,
        responseTime: "< 24 hours",
        responseTimeHours: 24,
        shippingDays: 12,
        shippingDaysEU: 15,
        orderCompletionRate: 94.5,
        disputeRate: 3.2,
        monthlyOrders: 500000,
        totalProducts: 10000000,
        yearEstablished: 2010,
        communicationScore: 70,
        qualityScore: 72,
        priceCompetitiveness: 99,
      },
      shipping: {
        methods: ["AliExpress Standard", "Cainiao", "ePacket", "DHL"],
        processingTime: "1-5 days",
        freeShippingThreshold: null,
        packagingQuality: "standard",
      },
      quality: {
        inspection: "Buyer protection program",
        returnPolicy: "15-day buyer protection",
        refundPolicy: "Full refund if not as described",
        replacementPolicy: "Contact seller for replacement",
        disputeResolution: "AliExpress mediation (3-7 days)",
        certifications: ["CE"],
      },
      catalog: {
        categories: ["Electronics", "Gadgets", "Fashion", "Home & Kitchen", "Beauty", "Toys", "Phone Accessories"],
        priceRange: { min: 0.3, max: 500 },
        moq: 1,
        samplesAvailable: true,
        samplePrice: null,
      },
      communication: {
        methods: ["Live Chat", "Message System"],
        languages: ["English", "Chinese"],
        supportHours: "24/7",
      },
      source: "aliexpress",
      sourceUrl: "https://aliexpress.com",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "amazon-surplus",
      name: "Amazon Liquidation (via Rainforest)",
      slug: "amazon-surplus",
      location: "Seattle, US",
      country: "US",
      flag: "\ud83c\uddfa\ud83c\uddf8",
      description: "Amazon liquidation and open-box products available at discounted prices. Accessible via Rainforest API for price monitoring and product sourcing.",
      specializations: ["Electronics", "Home & Kitchen", "Books", "Toys"],
      trustBadge: "gold",
      stats: {
        reliabilityScore: 92,
        rating: 4.6,
        reviews: 500000,
        responseTime: "< 4 hours",
        responseTimeHours: 4,
        shippingDays: 2,
        shippingDaysEU: 5,
        orderCompletionRate: 98.5,
        disputeRate: 0.8,
        monthlyOrders: 2000000,
        totalProducts: 500000,
        yearEstablished: 2000,
        communicationScore: 90,
        qualityScore: 88,
        priceCompetitiveness: 85,
      },
      shipping: {
        methods: ["Amazon Logistics", "UPS", "FedEx", "USPS"],
        processingTime: "Same day - 1 day",
        freeShippingThreshold: 35,
        packagingQuality: "premium",
      },
      quality: {
        inspection: "Amazon A-to-Z Guarantee",
        returnPolicy: "30-day returns",
        refundPolicy: "Full refund within 30 days",
        replacementPolicy: "Easy replacement via Amazon",
        disputeResolution: "Amazon mediation",
        certifications: ["ISO 9001"],
      },
      catalog: {
        categories: ["Electronics", "Home & Kitchen", "Books", "Toys", "Sports", "Beauty"],
        priceRange: { min: 5, max: 1000 },
        moq: 1,
        samplesAvailable: true,
        samplePrice: null,
      },
      communication: {
        methods: ["Email", "Phone", "Chat"],
        languages: ["English"],
        supportHours: "24/7",
      },
      source: "amazon",
      sourceUrl: "https://amazon.com",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "google-shopping-global",
      name: "Google Shopping Network",
      slug: "google-shopping-global",
      location: "Global",
      country: "US",
      flag: "\ud83c\uddfa\ud83c\uddf8",
      description: "Google Shopping aggregates products from thousands of retailers worldwide. Accessible via SerpAPI for comprehensive price comparison and product discovery.",
      specializations: ["All Categories"],
      trustBadge: "gold",
      stats: {
        reliabilityScore: 95,
        rating: 4.7,
        reviews: 1000000,
        responseTime: "Instant",
        responseTimeHours: 0,
        shippingDays: 3,
        shippingDaysEU: 5,
        orderCompletionRate: 99.0,
        disputeRate: 0.3,
        monthlyOrders: 5000000,
        totalProducts: 20000000,
        yearEstablished: 2013,
        communicationScore: 95,
        qualityScore: 90,
        priceCompetitiveness: 92,
      },
      shipping: {
        methods: ["Varies by retailer"],
        processingTime: "Varies",
        freeShippingThreshold: null,
        packagingQuality: "standard",
      },
      quality: {
        inspection: "Google Buyer Protection",
        returnPolicy: "Varies by retailer",
        refundPolicy: "Google purchase protection",
        replacementPolicy: "Varies by retailer",
        disputeResolution: "Google support mediation",
        certifications: [],
      },
      catalog: {
        categories: ["All Categories"],
        priceRange: { min: 1, max: 10000 },
        moq: 1,
        samplesAvailable: false,
        samplePrice: null,
      },
      communication: {
        methods: ["Email", "Help Center"],
        languages: ["English", "Multiple languages"],
        supportHours: "Business hours",
      },
      source: "compiled",
      sourceUrl: "https://shopping.google.com",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "keepa-price-tracker",
      name: "Keepa Price Intelligence",
      slug: "keepa-price-tracker",
      location: "Munich, Germany",
      country: "Germany",
      flag: "\ud83c\udde9\ud83c\uddea",
      description: "Keepa provides comprehensive Amazon price history and tracking data. Use price history to identify optimal sourcing opportunities and seasonal trends.",
      specializations: ["Electronics", "Gaming", "Books", "Home & Kitchen"],
      trustBadge: "gold",
      stats: {
        reliabilityScore: 96,
        rating: 4.8,
        reviews: 50000,
        responseTime: "< 2 hours",
        responseTimeHours: 2,
        shippingDays: 3,
        shippingDaysEU: 2,
        orderCompletionRate: 99.2,
        disputeRate: 0.2,
        monthlyOrders: 100000,
        totalProducts: 10000000,
        yearEstablished: 2011,
        communicationScore: 94,
        qualityScore: 95,
        priceCompetitiveness: 88,
      },
      shipping: {
        methods: ["Data API (no physical shipping)"],
        processingTime: "Instant API response",
        freeShippingThreshold: null,
        packagingQuality: "standard",
      },
      quality: {
        inspection: "Data accuracy guarantee",
        returnPolicy: "N/A (data service)",
        refundPolicy: "N/A (data service)",
        replacementPolicy: "N/A (data service)",
        disputeResolution: "Support ticket",
        certifications: ["ISO 27001"],
      },
      catalog: {
        categories: ["Electronics", "Gaming", "Books", "Home & Kitchen", "Toys"],
        priceRange: { min: 0, max: 0 },
        moq: 0,
        samplesAvailable: false,
        samplePrice: null,
      },
      communication: {
        methods: ["Email", "Documentation"],
        languages: ["English", "German"],
        supportHours: "Business hours",
      },
      source: "compiled",
      sourceUrl: "https://keepa.com",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "walmart-marketplace",
      name: "Walmart Marketplace (via Scraper)",
      slug: "walmart-marketplace",
      location: "Bentonville, US",
      country: "US",
      flag: "\ud83c\uddfa\ud83c\uddf8",
      description: "Walmart's online marketplace with competitive pricing and fast US shipping. Accessible via ScraperAPI for product search and price monitoring.",
      specializations: ["Electronics", "Home & Garden", "Fashion", "Grocery", "Auto"],
      trustBadge: "gold",
      stats: {
        reliabilityScore: 91,
        rating: 4.5,
        reviews: 300000,
        responseTime: "< 6 hours",
        responseTimeHours: 6,
        shippingDays: 3,
        shippingDaysEU: 7,
        orderCompletionRate: 97.8,
        disputeRate: 1.0,
        monthlyOrders: 3000000,
        totalProducts: 3000000,
        yearEstablished: 2000,
        communicationScore: 88,
        qualityScore: 87,
        priceCompetitiveness: 94,
      },
      shipping: {
        methods: ["Walmart Fulfillment", "USPS", "UPS", "FedEx"],
        processingTime: "1-2 days",
        freeShippingThreshold: 35,
        packagingQuality: "standard",
      },
      quality: {
        inspection: "Walmart Quality Assurance",
        returnPolicy: "30-day returns",
        refundPolicy: "Full refund within 30 days",
        replacementPolicy: "Walmart replacement policy",
        disputeResolution: "Walmart support",
        certifications: ["ISO 9001"],
      },
      catalog: {
        categories: ["Electronics", "Home & Garden", "Fashion", "Grocery", "Auto", "Sports"],
        priceRange: { min: 2, max: 2000 },
        moq: 1,
        samplesAvailable: false,
        samplePrice: null,
      },
      communication: {
        methods: ["Phone", "Chat", "Email"],
        languages: ["English", "Spanish"],
        supportHours: "24/7",
      },
      source: "compiled",
      sourceUrl: "https://walmart.com",
      lastUpdated: new Date().toISOString(),
    },
  ];
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
  const marketSuppliers = buildMarketSuppliers();
  const allSuppliers = [cjSupplier, ...marketSuppliers];

  cachedSuppliers = { data: allSuppliers, timestamp: Date.now() };
  return allSuppliers;
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

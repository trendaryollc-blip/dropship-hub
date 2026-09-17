import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import type { ScrapedProductData } from "@/types/listing-intelligence";

function detectPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("aliexpress.com") || lower.includes("aliexpress.")) return "aliexpress";
  if (lower.includes("amazon.") || lower.includes("amzn.")) return "amazon";
  if (lower.includes("ebay.")) return "ebay";
  if (lower.includes("walmart.")) return "walmart";
  if (lower.includes("shopify.") || lower.includes("myshopify.com")) return "shopify";
  if (lower.includes("cjdropshipping.com")) return "cj";
  if (lower.includes("temu.com")) return "temu";
  if (lower.includes("shein.com")) return "shein";
  if (lower.includes("alibaba.com") || lower.includes("1688.com")) return "alibaba";
  return "unknown";
}

async function scrapeAliExpress(url: string): Promise<ScrapedProductData> {
  const productIdMatch = url.match(/\/item\/(\d+)\.html/) || url.match(/\/item\/(\d+)/);
  const productId = productIdMatch?.[1] || "";

  const apiKey = process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY;
  if (!apiKey || !productId) {
    return {
      title: "",
      description: "",
      price: 0,
      currency: "USD",
      images: [],
      specifications: {},
      category: "",
      brand: "",
      rating: 0,
      reviewCount: 0,
      source: "aliexpress",
      sourceUrl: url,
      supplierName: "",
      inStock: true,
    };
  }

  const params = new URLSearchParams({
    engine: "aliexpress_product",
    product_id: productId,
    api_key: apiKey,
  });

  const res = await fetch(`https://serpapi.com/search?${params}`, {
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new Error(`SerpAPI returned ${res.status}`);
  const data = await res.json();
  const product = data.product || {};

  const specs: Record<string, string> = {};
  if (product.specifications) {
    for (const spec of product.specifications) {
      if (spec.specification_name && spec.specification_value) {
        specs[spec.specification_name] = spec.specification_value;
      }
    }
  }

  return {
    title: product.title || "",
    description: product.description || product.title || "",
    price: product.price?.value || product.price?.raw || 0,
    currency: product.price?.currency || "USD",
    images: product.images || [],
    specifications: specs,
    category: product.category || "",
    brand: product.brand || "",
    rating: product.rating || 0,
    reviewCount: product.reviews || 0,
    source: "aliexpress",
    sourceUrl: url,
    supplierName: product.store?.name || "",
    inStock: product.in_stock !== false,
    shippingInfo: product.shipping_info || "",
    variants: (product.variants || []).map((v: Record<string, unknown>) => ({
      name: String(v.name || ""),
      price: Number(v.price || 0),
      inStock: v.in_stock !== false,
    })),
  };
}

async function scrapeAmazon(url: string): Promise<ScrapedProductData> {
  const asinMatch = url.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i);
  const asin = asinMatch?.[1] || "";

  const apiKey = process.env.RAINFOREST_API_KEY || process.env.AMAZON_API_KEY;
  if (!apiKey) throw new Error("Rainforest API key not configured");

  const params = new URLSearchParams({
    api_key: apiKey,
    type: "product",
    amazon_domain: "amazon.com",
    asin,
    include_clause: "product(title,description,price,images,features,specifications,rating,total_ratings,brand,variations)",
  });

  const res = await fetch(`https://api.rainforestapi.com/request?${params}`, {
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new Error(`Rainforest API returned ${res.status}`);
  const data = await res.json();
  const product = data.product || {};

  const specs: Record<string, string> = {};
  if (product.specifications) {
    for (const spec of product.specifications) {
      if (spec.name && spec.value) {
        specs[spec.name] = spec.value;
      }
    }
  }

  return {
    title: product.title || "",
    description: (product.description || product.features?.join("\n") || ""),
    price: product.price?.value || product.price?.raw || 0,
    currency: product.price?.currency || "USD",
    images: product.images || [],
    specifications: specs,
    category: product.category || "",
    brand: product.brand || "",
    rating: product.rating || 0,
    reviewCount: product.total_ratings || 0,
    source: "amazon",
    sourceUrl: url,
    supplierName: product.brand || "",
    inStock: product.buybox?.is_prime !== undefined || true,
    shippingInfo: product.buybox?.shipping?.price ? `+$${product.buybox.shipping.price}` : undefined,
  };
}

async function scrapeGeneric(url: string): Promise<ScrapedProductData> {
  const apiKey = process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return {
      title: "",
      description: "",
      price: 0,
      currency: "USD",
      images: [],
      specifications: {},
      category: "",
      brand: "",
      rating: 0,
      reviewCount: 0,
      source: "unknown",
      sourceUrl: url,
      supplierName: "",
      inStock: true,
    };
  }

  const params = new URLSearchParams({
    engine: "google_shopping_product",
    product_id: url,
    api_key: apiKey,
  });

  const res = await fetch(`https://serpapi.com/search?${params}`, {
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);

  if (!res?.ok) {
    return {
      title: "",
      description: "",
      price: 0,
      currency: "USD",
      images: [],
      specifications: {},
      category: "",
      brand: "",
      rating: 0,
      reviewCount: 0,
      source: "unknown",
      sourceUrl: url,
      supplierName: "",
      inStock: true,
    };
  }

  const data = await res.json();
  const product = data.product || {};

  return {
    title: product.title || "",
    description: product.description || "",
    price: product.price?.raw || product.price || 0,
    currency: product.price?.currency || "USD",
    images: product.media?.images || [],
    specifications: product.specifications || {},
    category: product.category || "",
    brand: product.brand || "",
    rating: product.rating || 0,
    reviewCount: product.reviews || 0,
    source: "google_shopping",
    sourceUrl: url,
    supplierName: product.seller || "",
    inStock: true,
  };
}

async function scrapeProduct(url: string): Promise<ScrapedProductData> {
  const platform = detectPlatform(url);
  switch (platform) {
    case "aliexpress":
      return scrapeAliExpress(url);
    case "amazon":
      return scrapeAmazon(url);
    default:
      return scrapeGeneric(url);
  }
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const platform = detectPlatform(url);
    const data = await scrapeProduct(url);

    if (!data.title && !data.description && data.images.length === 0) {
      return NextResponse.json(
        { error: "Could not extract product data from this URL. Try a different URL or enter details manually." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      data,
      platform,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[listings/import] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to scrape product data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.PRODUCT_ENRICH);

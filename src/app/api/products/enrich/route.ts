import { NextRequest, NextResponse } from "next/server";
import { searchAmazon, searchGoogleShopping, searchCJProducts, searchKeepaProducts, searchAliExpress } from "@/lib/platform-search";
import { getSuppliers } from "@/lib/supplier-service";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/api-errors";

interface PlatformPrice {
  platform: string;
  price: number;
  rating: number | null;
  reviews: number | null;
  inStock: boolean | null;
  url: string;
  brand?: string;
}

interface EnrichmentResult {
  platforms: PlatformPrice[];
  cheapest: PlatformPrice | null;
  mostExpensive: PlatformPrice | null;
  priceSpread: number;
  supplierMatches: { id: string; name: string; trustBadge: string; location: string; flag: string; price: number | null; shippingToUS: string; shippingToEU: string; reliabilityScore: number; responseTime: string }[];
  sourcesUsed: string[];
  coverage: { queried: number; succeeded: number; uniquePlatforms: number };
}

async function searchPlatformSafely(
  searchFn: (q: string) => Promise<{ search_results: { title: string; price: number | null; rating?: number; reviews?: number; link: string; brand?: string }[] }>,
  query: string,
  platformName: string
): Promise<PlatformPrice[]> {
  try {
    const data = await searchFn(query);
    return (data.search_results || []).slice(0, 1).map((item) => ({
      platform: platformName,
      price: item.price || 0,
      rating: typeof item.rating === "number" ? item.rating : null,
      reviews: typeof item.reviews === "number" ? item.reviews : null,
      inStock: item.price != null && item.price > 0 ? true : null,
      url: item.link || "#",
      brand: item.brand || undefined,
    }));
  } catch {
    return [];
  }
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { title, source, price } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Product title is required" }, { status: 400 });
    }

    const query = title.slice(0, 80);
    const basePrice = price || 0;

    const searchTasks: Promise<PlatformPrice[]>[] = [];

    searchTasks.push(searchPlatformSafely(searchAmazon, query, "Amazon"));
    searchTasks.push(searchPlatformSafely(searchGoogleShopping, query, "Google Shopping"));
    searchTasks.push(searchPlatformSafely(searchCJProducts, query, "CJ Dropshipping"));
    searchTasks.push(searchPlatformSafely(searchKeepaProducts, query, "Keepa"));
    searchTasks.push(searchPlatformSafely(searchAliExpress, query, "AliExpress"));

    const results = await Promise.allSettled(searchTasks);

    const allPrices: PlatformPrice[] = [];
    const sourcesUsed: string[] = [];

    results.forEach((result, index) => {
      const platformNames = ["Amazon", "Google Shopping", "CJ Dropshipping", "Keepa", "AliExpress"];
      if (result.status === "fulfilled" && result.value.length > 0) {
        allPrices.push(...result.value);
        sourcesUsed.push(platformNames[index]);
      }
    });

    if (basePrice > 0 && !allPrices.some((p) => p.platform === source)) {
      allPrices.unshift({
        platform: source || "Original",
        price: basePrice,
        rating: null,
        reviews: null,
        inStock: true,
        url: "#",
      });
    }

    let validPrices = allPrices.filter((p) => p.price > 0);

    const platformBest = new Map<string, PlatformPrice>();
    for (const p of validPrices) {
      const existing = platformBest.get(p.platform);
      if (!existing || p.price < existing.price) {
        platformBest.set(p.platform, p);
      }
    }
    validPrices = [...platformBest.values()];

    const sorted = [...validPrices].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0] || null;
    const mostExpensive = sorted[sorted.length - 1] || null;
    const priceSpread = cheapest && mostExpensive ? mostExpensive.price - cheapest.price : 0;

    let supplierMatches: EnrichmentResult["supplierMatches"] = [];
    try {
      const suppliers = await getSuppliers();
      supplierMatches = suppliers.slice(0, 3).map((s) => ({
          id: s.id,
          name: s.name,
          trustBadge: s.trustBadge,
          location: s.location,
          flag: s.flag,
          price: null,
          shippingToUS: `${s.stats.shippingDays}-${s.stats.shippingDays + 5} days`,
          shippingToEU: `${s.stats.shippingDaysEU}-${s.stats.shippingDaysEU + 5} days`,
          reliabilityScore: s.stats.reliabilityScore,
          responseTime: s.stats.responseTime,
        }));
    } catch (_err) {
      // Supplier matching is optional — log and continue
    }

    return NextResponse.json({
      platforms: validPrices,
      cheapest,
      mostExpensive,
      priceSpread: +priceSpread.toFixed(2),
      supplierMatches,
      sourcesUsed,
      coverage: {
        queried: searchTasks.length,
        succeeded: sourcesUsed.length,
        uniquePlatforms: validPrices.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Enrichment failed", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.PRODUCT_ENRICH);

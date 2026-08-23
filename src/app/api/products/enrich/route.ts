import { NextRequest, NextResponse } from "next/server";
import { searchAmazon, searchGoogleShopping, searchCJProducts, searchKeepaProducts } from "@/lib/platform-search";
import { getSuppliers } from "@/lib/supplier-service";

interface PlatformPrice {
  platform: string;
  price: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  url: string;
}

interface EnrichmentResult {
  platforms: PlatformPrice[];
  cheapest: PlatformPrice | null;
  mostExpensive: PlatformPrice | null;
  priceSpread: number;
  supplierMatches: { id: string; name: string; trustBadge: string; location: string; flag: string; price: number; shippingToUS: string; shippingToEU: string; reliabilityScore: number; responseTime: string }[];
  sourcesUsed: string[];
}

async function searchPlatformSafely(
  searchFn: (q: string) => Promise<{ search_results: { title: string; price: number | null; rating?: number; reviews?: number; link: string }[] }>,
  query: string,
  platformName: string
): Promise<PlatformPrice[]> {
  try {
    const data = await searchFn(query);
    return (data.search_results || []).slice(0, 3).map((item) => ({
      platform: platformName,
      price: item.price || 0,
      rating: item.rating || 0,
      reviews: item.reviews || 0,
      inStock: item.price !== null && item.price > 0,
      url: item.link || "#",
    }));
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
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

    const results = await Promise.allSettled(searchTasks);

    const allPrices: PlatformPrice[] = [];
    const sourcesUsed: string[] = [];

    results.forEach((result, index) => {
      const platformNames = ["Amazon", "Google Shopping", "CJ Dropshipping", "Keepa"];
      if (result.status === "fulfilled" && result.value.length > 0) {
        allPrices.push(...result.value);
        sourcesUsed.push(platformNames[index]);
      }
    });

    if (basePrice > 0 && !allPrices.some((p) => p.platform === source)) {
      allPrices.unshift({
        platform: source || "Original",
        price: basePrice,
        rating: 0,
        reviews: 0,
        inStock: true,
        url: "#",
      });
    }

    const validPrices = allPrices.filter((p) => p.price > 0);
    const sorted = [...validPrices].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0] || null;
    const mostExpensive = sorted[sorted.length - 1] || null;
    const priceSpread = cheapest && mostExpensive ? mostExpensive.price - cheapest.price : 0;

    let supplierMatches: EnrichmentResult["supplierMatches"] = [];
    try {
      const suppliers = await getSuppliers();
      supplierMatches = suppliers
        .filter((s) => s.catalog.categories.some((c) => c.toLowerCase().includes("all") || query.toLowerCase().includes(c.toLowerCase())))
        .slice(0, 3)
        .map((s) => ({
          id: s.id,
          name: s.name,
          trustBadge: s.trustBadge,
          location: s.location,
          flag: s.flag,
          price: cheapest ? +(cheapest.price * 0.3).toFixed(2) : 0,
          shippingToUS: `${s.stats.shippingDays}-${s.stats.shippingDays + 5} days`,
          shippingToEU: `${s.stats.shippingDaysEU}-${s.stats.shippingDaysEU + 5} days`,
          reliabilityScore: s.stats.reliabilityScore,
          responseTime: s.stats.responseTime,
        }));
    } catch {}

    return NextResponse.json({
      platforms: validPrices,
      cheapest,
      mostExpensive,
      priceSpread: +priceSpread.toFixed(2),
      supplierMatches,
      sourcesUsed,
    } satisfies EnrichmentResult);
  } catch (error) {
    return NextResponse.json(
      { error: "Enrichment failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { searchAmazon, searchGoogleShopping, searchCJProducts, searchKeepaProducts, searchAliExpress } from "@/lib/platform-search";
import { getSuppliers } from "@/lib/supplier-service";
import { searchSupplierPlatforms } from "@/lib/supplier-platform-search";
import { normalizeSupplierSources } from "@/lib/suppliers/normalize-offers";
import { pickAutoLink } from "@/lib/suppliers/fuzzy-match";
import type { NormalizedSupplierOffer } from "@/types/supplier-offers";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { directoryEntryFromOffer, upsertDirectorySupplier } from "@/lib/suppliers/directory";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/api-errors";
import { resolveSupplierTrust, type TrustBadge } from "@/lib/suppliers/trust";

interface PlatformPrice {
  platform: string;
  title: string;
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
  // trustBadge resolves through resolveSupplierTrust — the single source of
  // truth — so unmeasured suppliers always read "unverified" and shipping is
  // null when the source has no measured value: the UI hides those fields
  // instead of rendering an invented range or tier.
  supplierMatches: { id: string; name: string; trustBadge: TrustBadge; location: string; flag: string; price: number | null; shippingToUS: string | null; shippingToEU: string | null; reliabilityScore: number; responseTime: string }[];
  sourcesUsed: string[];
  coverage: { queried: number; succeeded: number; uniquePlatforms: number };
}

function measuredDays(days: number): string | null {
  return days > 0 ? `${days} days` : null;
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
      title: item.title,
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

export const POST = withAuth(async (request: NextRequest, uid: string) => {
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
        title: query,
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
    let supplierOffers: NormalizedSupplierOffer[] = [];
    let autoLink: { offer: NormalizedSupplierOffer; confidence: number } | null = null;
    try {
      // Live multi-supplier search (bounded so enrich stays fast); falls back
      // to the local CJ-backed directory when unavailable.
      try {
        const outcome = await searchSupplierPlatforms(
          query,
          ["alibaba", "dhgate", "global_sources", "aliexpress", "cj"],
          { deadlineMs: 15000 }
        );
        const offers = normalizeSupplierSources(outcome.sources).slice(0, 30);
        if (offers.length > 0) {
          supplierOffers = offers;
          autoLink = pickAutoLink({ title: query, image: null, price: basePrice > 0 ? basePrice : null }, offers);

          // Persist the suppliers this search surfaced so the directory knows
          // about them before a choice is made. Best-effort, deduped and bounded
          // — a directory write must never fail enrichment.
          const seen = new Set<string>();
          const discovered = offers.filter((o) => {
            if (seen.has(o.supplierId)) return false;
            seen.add(o.supplierId);
            return true;
          });
          try {
            const db = await getAdminDB();
            await Promise.all(
              discovered
                .slice(0, 10)
                .map((offer) =>
                  upsertDirectorySupplier(db, uid, directoryEntryFromOffer(offer, "discovery"))
                )
            );
          } catch {
            // best-effort only
          }
        }
      } catch {
        // Live supplier search is optional — fall through to directory
      }

      if (supplierOffers.length === 0) {
        const suppliers = await getSuppliers();
        supplierMatches = suppliers.slice(0, 3).map((s) => ({
            id: s.id,
            name: s.name,
            trustBadge: resolveSupplierTrust(s),
            location: s.location,
            flag: s.flag,
            price: null,
            shippingToUS: measuredDays(s.stats.shippingDays),
            shippingToEU: measuredDays(s.stats.shippingDaysEU),
            reliabilityScore: s.stats.reliabilityScore,
            responseTime: s.stats.responseTime,
          }));
      } else {
        supplierMatches = supplierOffers.slice(0, 3).map((o) => ({
            id: o.supplierId,
            name: o.supplierName,
            trustBadge: "unverified",
            location: o.platformId,
            flag: "",
            price: o.unitCost,
            shippingToUS: null,
            shippingToEU: null,
            reliabilityScore: 0,
            responseTime: "",
          }));
      }
    } catch (_err) {
      // Supplier matching is optional — log and continue
    }

    return NextResponse.json({
      platforms: validPrices,
      cheapest,
      mostExpensive,
      priceSpread: +priceSpread.toFixed(2),
      supplierMatches,
      supplierOffers,
      autoLink,
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

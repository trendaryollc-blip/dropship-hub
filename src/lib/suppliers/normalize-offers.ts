import type { SupplierSource } from "@/lib/supplier-platform-search";
import type { NormalizedSupplierOffer, SupplierPlatformId } from "@/types/supplier-offers";

const PLATFORM_IDS: ReadonlySet<string> = new Set([
  "cj",
  "aliexpress",
  "alibaba",
  "dhgate",
  "global_sources",
]);

function toPlatformId(platformId: string): SupplierPlatformId | null {
  return PLATFORM_IDS.has(platformId) ? (platformId as SupplierPlatformId) : null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Normalize live supplier sources (store attribution + discovered listings)
 * into a flat per-listing offer list. Prices/ratings pass through untouched;
 * missing measurements stay null so the UI can render —/Unknown honestly.
 */
export function normalizeSupplierSources(sources: SupplierSource[]): NormalizedSupplierOffer[] {
  const offers: NormalizedSupplierOffer[] = [];
  for (const source of sources) {
    const platformId = toPlatformId(source.platformId);
    if (!platformId) continue;
    const supplierSlug = slugify(source.storeName || source.platformId) || source.platformId;
    for (const listing of source.listings) {
      offers.push({
        supplierId: `${platformId}:${supplierSlug}`,
        platformId,
        supplierName: source.storeName || source.platformName,
        storeUrl: source.storeUrl || null,
        productId: `${platformId}:${supplierSlug}:${slugify(listing.title).slice(0, 40) || "listing"}`,
        title: listing.title,
        image: listing.image ?? null,
        url: listing.link,
        unitCost: typeof listing.price === "number" ? listing.price : null,
        currency: listing.currency ?? null,
        shippingCost: null,
        shippingDays: typeof listing.shippingDays === "number" ? listing.shippingDays : null,
        rating: typeof listing.rating === "number" ? listing.rating : null,
        reviews: typeof listing.reviews === "number" ? listing.reviews : null,
        inStock: typeof listing.price === "number" && listing.price > 0 ? true : null,
        stockLevel: null,
        moq: typeof listing.moq === "number" ? listing.moq : null,
        dataSource: source.dataSource,
        confidence: 0,
        matchReasons: [],
      });
    }
  }
  return offers;
}

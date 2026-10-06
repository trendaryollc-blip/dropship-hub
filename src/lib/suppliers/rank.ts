// ── Real-signal ranking for discovered suppliers ──────────────────────────
//
// Discovered suppliers carry no measured reliability/shipping/response data.
// Ranking them by those fields therefore sorts by zeros and is meaningless.
// This module ranks by signals that are actually observed: listing volume
// (how much of their catalog matched the query), price availability, then the
// catalog rating. Callers still apply query relevance first.

import type { SupplierProfile } from "@/types/supplier";

export interface RealSignalSummary {
  /** Matching listings observed for this supplier (filtered to the query). */
  listingCount: number;
  /** Observed price range, or null when no listing had a usable price. */
  priceRange: { min: number; max: number } | null;
}

export function listingCountOf(supplier: SupplierProfile): number {
  const listings = supplier.listings?.length ?? 0;
  if (listings > 0) return listings;
  return supplier.stats?.totalProducts ?? 0;
}

export function observedPriceRange(
  supplier: SupplierProfile
): { min: number; max: number } | null {
  const { min, max } = supplier.catalog?.priceRange ?? { min: 0, max: 0 };
  if (min > 0 && max > 0) return { min, max };
  return null;
}

export function summarizeRealSignals(supplier: SupplierProfile): RealSignalSummary {
  return {
    listingCount: listingCountOf(supplier),
    priceRange: observedPriceRange(supplier),
  };
}

/**
 * Deterministic comparator: more matching listings first, then suppliers with
 * an observed price range, then higher catalog rating, then stable name order.
 */
export function compareRealSignals(a: SupplierProfile, b: SupplierProfile): number {
  const listingsA = listingCountOf(a);
  const listingsB = listingCountOf(b);
  if (listingsA !== listingsB) return listingsB - listingsA;

  const priceA = observedPriceRange(a) ? 1 : 0;
  const priceB = observedPriceRange(b) ? 1 : 0;
  if (priceA !== priceB) return priceB - priceA;

  const ratingA = a.stats?.rating ?? 0;
  const ratingB = b.stats?.rating ?? 0;
  if (ratingA !== ratingB) return ratingB - ratingA;

  return a.name.localeCompare(b.name);
}

export type SupplierSortKey =
  | "relevance"
  | "rating"
  | "reliability"
  | "response"
  | "orders"
  | "price";

/**
 * Comparator for a sort key. "relevance" is the honest default for discovered
 * suppliers; the metric-based keys are kept for curated directories that
 * actually measure them.
 */
export function compareSuppliers(
  key: SupplierSortKey,
  a: SupplierProfile,
  b: SupplierProfile
): number {
  switch (key) {
    case "relevance":
      return compareRealSignals(a, b);
    case "reliability":
      return (b.stats?.reliabilityScore ?? 0) - (a.stats?.reliabilityScore ?? 0);
    case "response":
      return (a.stats?.responseTimeHours ?? 0) - (b.stats?.responseTimeHours ?? 0);
    case "orders":
      return (b.stats?.monthlyOrders ?? 0) - (a.stats?.monthlyOrders ?? 0);
    case "price":
      return (b.stats?.priceCompetitiveness ?? 0) - (a.stats?.priceCompetitiveness ?? 0);
    case "rating":
    default:
      return (b.stats?.rating ?? 0) - (a.stats?.rating ?? 0);
  }
}

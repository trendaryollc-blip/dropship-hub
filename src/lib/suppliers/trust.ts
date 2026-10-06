// ── Unified supplier trust resolution ─────────────────────────────────────
//
// A supplier only earns a measured trust tier ("gold" | "silver" | "bronze")
// when its performance has actually been observed. Discovered/scraped suppliers
// carry zero measured metrics, so they must always resolve to "unverified" —
// regardless of any tier value that may have been attached upstream. This is
// the single source of truth so the Discover list, the product-detail matches,
// and the enrichment route cannot drift apart.

import type { SupplierProfile } from "@/types/supplier";

export type TrustBadge = "gold" | "silver" | "bronze" | "unverified";

export interface TrustSignals {
  trustBadge?: string | null;
  dataSource?: string | null;
  reliabilityScore?: number | null;
  orderCompletionRate?: number | null;
}

const VALID_BADGES: ReadonlySet<string> = new Set(["gold", "silver", "bronze", "unverified"]);

/**
 * True only when at least one quality signal has been measured. Rating and
 * listing counts do not qualify — they are catalog facts, not reliability.
 */
export function isMeasuredSupplier(signals: TrustSignals): boolean {
  const reliability = signals.reliabilityScore ?? 0;
  const completion = signals.orderCompletionRate ?? 0;
  return reliability > 0 || completion > 0;
}

/**
 * Resolve the badge a UI should render. Unmeasured suppliers are forced to
 * "unverified"; measured suppliers keep a valid tier or fall back to
 * "unverified" when the stored value is missing/invalid.
 */
export function resolveTrustBadge(signals: TrustSignals): TrustBadge {
  if (!isMeasuredSupplier(signals)) return "unverified";
  const candidate = (signals.trustBadge ?? "").toLowerCase();
  return VALID_BADGES.has(candidate) ? (candidate as TrustBadge) : "unverified";
}

export function supplierTrustSignals(supplier: SupplierProfile): TrustSignals {
  return {
    trustBadge: supplier.trustBadge,
    dataSource: supplier.dataSource,
    reliabilityScore: supplier.stats?.reliabilityScore,
    orderCompletionRate: supplier.stats?.orderCompletionRate,
  };
}

/** Convenience wrapper for a full profile. */
export function resolveSupplierTrust(supplier: SupplierProfile): TrustBadge {
  return resolveTrustBadge(supplierTrustSignals(supplier));
}

/**
 * One honest line describing a supplier for AI prompts and exports. Unmeasured
 * fields are labelled as unmeasured rather than rendered as zeros.
 */
export function supplierPromptLine(supplier: SupplierProfile): string {
  const stats = supplier.stats ?? ({} as SupplierProfile["stats"]);
  const reliability =
    (stats.reliabilityScore ?? 0) > 0 ? `${stats.reliabilityScore}% reliability` : "reliability unmeasured";
  const rating = (stats.rating ?? 0) > 0 ? `${stats.rating} rating` : "rating unmeasured";
  const shipping = (stats.shippingDays ?? 0) > 0 ? `${stats.shippingDays}d shipping` : "shipping time unmeasured";
  return `${supplier.name} (${resolveSupplierTrust(supplier)} badge, ${reliability}, ${rating}, ${shipping})`;
}

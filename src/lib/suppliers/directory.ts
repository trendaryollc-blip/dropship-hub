// ── Persisted supplier directory ──────────────────────────────────────────
//
// Discovery results are ephemeral and re-scraped every session. Persisting a
// supplier the moment it is surfaced (or chosen) lets observed performance
// accumulate against a stable id, so the directory gets more useful over time
// instead of resetting. The Firestore doc id is derived from the supplier id,
// so re-seeing a supplier merges rather than duplicates.

import type { NormalizedSupplierOffer } from "@/types/supplier-offers";
import type { SupplierProfile } from "@/types/supplier";
import { sanitizeKey, type AdminDB } from "./keys";

export type DirectorySource = "discovery" | "manual-selection" | "auto-link";

export interface SupplierDirectoryEntry {
  supplierId: string;
  name: string;
  platformId: string;
  storeUrl: string | null;
  dataSource: "live" | "estimated";
  specializations: string[];
  listingCount: number;
  priceRange: { min: number; max: number; currency?: string | null } | null;
  source: DirectorySource;
  firstSeenAt: string;
  lastSeenAt: string;
}

export function sanitizeSupplierKey(id: string): string {
  return sanitizeKey(id);
}

export function directoryEntryFromOffer(
  offer: NormalizedSupplierOffer,
  source: DirectorySource,
  at = new Date().toISOString()
): SupplierDirectoryEntry {
  return {
    supplierId: offer.supplierId,
    name: offer.supplierName,
    platformId: offer.platformId,
    storeUrl: offer.storeUrl ?? null,
    dataSource: offer.dataSource,
    specializations: [],
    listingCount: 1,
    priceRange:
      typeof offer.unitCost === "number" && offer.unitCost > 0
        ? { min: offer.unitCost, max: offer.unitCost, currency: offer.currency ?? null }
        : null,
    source,
    firstSeenAt: at,
    lastSeenAt: at,
  };
}

export function directoryEntryFromProfile(
  supplier: SupplierProfile,
  source: DirectorySource,
  at = new Date().toISOString()
): SupplierDirectoryEntry {
  const { min, max } = supplier.catalog?.priceRange ?? { min: 0, max: 0 };
  return {
    supplierId: supplier.id,
    name: supplier.name,
    platformId: supplier.source,
    storeUrl: supplier.sourceUrl ?? null,
    dataSource: supplier.dataSource,
    specializations: supplier.specializations?.slice(0, 12) ?? [],
    listingCount: supplier.listings?.length ?? supplier.stats?.totalProducts ?? 0,
    priceRange: min > 0 && max > 0 ? { min, max } : null,
    source,
    firstSeenAt: at,
    lastSeenAt: at,
  };
}

export interface AssignmentDirectoryInput {
  supplierId: string;
  supplierName: string;
  platformId?: string;
  storeUrl?: string | null;
  unitCost?: number | null;
  currency?: string | null;
  dataSource?: "live" | "estimated";
}

export function directoryEntryFromAssignment(
  input: AssignmentDirectoryInput,
  source: DirectorySource,
  at = new Date().toISOString()
): SupplierDirectoryEntry {
  const cost = typeof input.unitCost === "number" && input.unitCost > 0 ? input.unitCost : null;
  return {
    supplierId: input.supplierId,
    name: input.supplierName,
    platformId: input.platformId ?? "other",
    storeUrl: input.storeUrl ?? null,
    dataSource: input.dataSource ?? "estimated",
    specializations: [],
    listingCount: 0,
    priceRange: cost !== null ? { min: cost, max: cost, currency: input.currency ?? null } : null,
    source,
    firstSeenAt: at,
    lastSeenAt: at,
  };
}

/**
 * Merge a directory entry, preserving the original firstSeenAt and widening the
 * observed price range. Best-effort — the caller should not fail the primary
 * action if this throws.
 */
export async function upsertDirectorySupplier(
  db: AdminDB,
  uid: string,
  entry: SupplierDirectoryEntry
): Promise<void> {
  const ref = db
    .collection("users")
    .doc(uid)
    .collection("supplierDirectory")
    .doc(sanitizeSupplierKey(entry.supplierId));
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set(entry, { merge: true });
    return;
  }
  const existing = snap.data() as SupplierDirectoryEntry;
  const mergedRange = mergeRange(existing.priceRange, entry.priceRange);
  await ref.set(
    {
      ...entry,
      firstSeenAt: existing.firstSeenAt ?? entry.firstSeenAt,
      listingCount: Math.max(existing.listingCount ?? 0, entry.listingCount ?? 0),
      specializations:
        entry.specializations.length > 0 ? entry.specializations : existing.specializations,
      priceRange: mergedRange,
    },
    { merge: true }
  );
}

function mergeRange(
  a: SupplierDirectoryEntry["priceRange"],
  b: SupplierDirectoryEntry["priceRange"]
): SupplierDirectoryEntry["priceRange"] {
  if (!a) return b;
  if (!b) return a;
  return {
    min: Math.min(a.min, b.min),
    max: Math.max(a.max, b.max),
    currency: a.currency ?? b.currency ?? null,
  };
}

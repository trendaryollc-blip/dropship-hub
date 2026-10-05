// ── Normalized cross-platform supplier offers ─────────────────────────────
// Unified schema for supplier results from CJ, AliExpress, Alibaba, DHgate and
// Global Sources. Every numeric field is nullable: null means "not measured",
// and the UI must render null as —/Unknown, never 0 or an invented value.

export type SupplierPlatformId = "cj" | "aliexpress" | "alibaba" | "dhgate" | "global_sources";

export interface NormalizedSupplierOffer {
  supplierId: string;
  platformId: SupplierPlatformId;
  supplierName: string;
  storeUrl: string | null;
  productId: string;
  title: string;
  image: string | null;
  url: string;
  unitCost: number | null;
  currency: string | null;
  shippingCost: number | null;
  shippingDays: number | null;
  rating: number | null;
  reviews: number | null;
  inStock: boolean | null;
  stockLevel: number | null;
  moq: number | null;
  dataSource: "live" | "estimated";
  confidence: number;
  matchReasons: string[];
}

/** Confidence at or above which an offer may be auto-linked. */
export const AUTO_LINK_CONFIDENCE = 0.8;

export interface AutoLinkResult {
  offer: NormalizedSupplierOffer;
  confidence: number;
}

/** Firestore shape for users/{uid}/productSuppliers/{productId}. */
export interface ProductSupplierDoc {
  productId: string;
  selectedSupplierId: string | null;
  selectedSupplierName: string | null;
  supplierId?: string;
  supplierName?: string;
  unitCost: number;
  shippingCost: number;
  source: "auto" | "manual" | "auto_accepted" | "auto_rejected";
  confidence: number | null;
  candidates: NormalizedSupplierOffer[];
  needsAttention: boolean;
  updatedAt: string;
}

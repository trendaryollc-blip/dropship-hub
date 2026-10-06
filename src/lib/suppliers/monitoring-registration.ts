// ── Register a pushed product for supplier inventory monitoring ───────────
//
// After a product is listed on the store with a chosen supplier, its supplier
// product URL is registered as a monitored product so the existing
// /api/inventory/sync scrape can surface stock-outs and price drops before
// orders arrive. Idempotent: re-pushing the same product merges.

import type { MonitoredProduct } from "@/lib/monitoring/types";
import { DEFAULT_PRICE_DROP_THRESHOLD } from "@/lib/monitoring/types";
import { sanitizeKey, type AdminDB } from "./keys";

export interface RegisterMonitoringInput {
  productId: string;
  productTitle: string;
  sourceUrl: string;
  currentPrice: number;
  productImage?: string;
  storeId?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
}

/**
 * Best-effort. Returns true when a NEW monitoring doc was created, false when
 * it already existed (fields refreshed) or inputs were insufficient.
 */
export async function registerSupplierProductMonitoring(
  db: AdminDB,
  uid: string,
  input: RegisterMonitoringInput
): Promise<boolean> {
  if (!input.sourceUrl || !input.productId) return false;
  const ref = db
    .collection("users")
    .doc(uid)
    .collection("monitoredProducts")
    .doc(sanitizeKey(input.productId));

  const snap = await ref.get();
  const now = new Date().toISOString();
  const price = Number.isFinite(input.currentPrice) && input.currentPrice > 0 ? input.currentPrice : 0;

  if (snap.exists) {
    await ref.set(
      {
        productTitle: input.productTitle,
        productImage: input.productImage ?? undefined,
        sourceUrl: input.sourceUrl,
        ...(input.supplierId ? { supplierId: input.supplierId, supplierName: input.supplierName ?? "" } : {}),
        ...(price > 0
          ? {
              currentPrice: price,
              lowestPrice: Math.min((snap.data()?.lowestPrice as number) || price, price),
              highestPrice: Math.max((snap.data()?.highestPrice as number) || price, price),
            }
          : {}),
        lastSeenAt: now,
      },
      { merge: true }
    );
    return false;
  }

  const doc: Omit<MonitoredProduct, "id"> = {
    productId: input.productId,
    productTitle: input.productTitle,
    productImage: input.productImage,
    source: "supplier",
    sourceUrl: input.sourceUrl,
    currentPrice: price,
    lowestPrice: price,
    highestPrice: price,
    lastChecked: "",
    priceHistory: [],
    stockStatus: "unknown",
    alerts: [],
    priceDropThreshold: DEFAULT_PRICE_DROP_THRESHOLD,
    autoDelist: false,
    ...(input.supplierId ? { supplierId: input.supplierId, supplierName: input.supplierName ?? "" } : {}),
  };
  await ref.set({ ...doc, lastSeenAt: now }, { merge: true });
  return true;
}

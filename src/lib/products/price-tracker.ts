import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import type { ProductPricePoint } from "./price-key";

export interface ProductPriceSeries {
  key: string;
  title: string;
  history: ProductPricePoint[];
  updatedAt: string;
}

const MAX_POINTS = 90;

/**
 * Record today's per-platform prices for a viewed product. Same-day views
 * update the existing point instead of duplicating it. Series are capped.
 */
export async function recordProductPriceSnapshot(
  uid: string,
  key: string,
  title: string,
  prices: Record<string, number>
): Promise<void> {
  try {
    const clean: Record<string, number> = {};
    for (const [platform, price] of Object.entries(prices)) {
      if (typeof price === "number" && price > 0 && Number.isFinite(price)) {
        clean[platform] = Math.round(price * 100) / 100;
      }
    }
    if (Object.keys(clean).length === 0) return;

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("productPriceViews").doc(key);
    const today = new Date().toISOString().split("T")[0];

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      const history: ProductPricePoint[] = snap.exists
        ? (((snap.data() as ProductPriceSeries).history as ProductPricePoint[]) || [])
        : [];
      const last = history[history.length - 1];
      if (last && last.date === today) {
        last.prices = { ...last.prices, ...clean };
      } else {
        history.push({ date: today, prices: clean });
        if (history.length > MAX_POINTS) {
          history.splice(0, history.length - MAX_POINTS);
        }
      }
      transaction.set(
        docRef,
        {
          key,
          title,
          history,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  } catch (err) {
    logger.error("Failed to record product price snapshot", {
      uid,
      key,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function getProductPriceHistory(uid: string, key: string, days = 90): Promise<ProductPricePoint[]> {
  try {
    const db = await getAdminDB();
    const doc = await db.collection("users").doc(uid).collection("productPriceViews").doc(key).get();
    if (!doc.exists) return [];
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
    const history = ((doc.data() as ProductPriceSeries).history as ProductPricePoint[]) || [];
    return history.filter((p) => p.date >= cutoff);
  } catch (err) {
    logger.error("Failed to get product price history", {
      uid,
      key,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

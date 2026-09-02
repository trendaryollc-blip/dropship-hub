import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { MAX_PRICE_HISTORY_DAYS, type PriceHistoryEntry, type MonitoredProduct } from "./types";

export async function appendPriceSnapshot(
  uid: string,
  monitoredId: string,
  entry: PriceHistoryEntry
): Promise<void> {
  try {
    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("monitoredProducts").doc(monitoredId);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists) return;

      const product = snap.data() as MonitoredProduct;
      const history = [...(product.priceHistory || [])];
      const today = entry.date || new Date().toISOString().split("T")[0];

      const lastEntry = history[history.length - 1];
      if (lastEntry && lastEntry.date === today) {
        lastEntry.price = entry.price;
        if (entry.source) lastEntry.source = entry.source;
      } else {
        history.push({ date: today, price: entry.price, source: entry.source });
        if (history.length > MAX_PRICE_HISTORY_DAYS) {
          history.splice(0, history.length - MAX_PRICE_HISTORY_DAYS);
        }
      }

      const updates: Record<string, unknown> = {
        priceHistory: history,
        lastChecked: new Date().toISOString(),
      };

      if (entry.price > 0) {
        updates.currentPrice = entry.price;
        updates.lowestPrice = Math.min(product.lowestPrice || entry.price, entry.price);
        updates.highestPrice = Math.max(product.highestPrice || entry.price, entry.price);
      }

      transaction.update(docRef, updates);
    });
  } catch (err) {
    logger.error("Failed to append price snapshot", {
      uid,
      monitoredId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function getPriceHistory(
  uid: string,
  monitoredId: string,
  days = 30
): Promise<PriceHistoryEntry[]> {
  try {
    const db = await getAdminDB();
    const doc = await db.collection("users").doc(uid).collection("monitoredProducts").doc(monitoredId).get();

    if (!doc.exists) return [];

    const product = doc.data() as MonitoredProduct;
    const cutoffDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

    return (product.priceHistory || []).filter((entry) => entry.date >= cutoffDate);
  } catch (err) {
    logger.error("Failed to get price history", {
      uid,
      monitoredId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

export function calculatePriceStats(history: PriceHistoryEntry[]): {
  current: number;
  lowest: number;
  highest: number;
  avgChangePercent: number;
  volatility: number;
} {
  if (history.length === 0) {
    return { current: 0, lowest: 0, highest: 0, avgChangePercent: 0, volatility: 0 };
  }

  const prices = history.map((h) => h.price).filter((p) => p > 0);
  if (prices.length === 0) {
    return { current: 0, lowest: 0, highest: 0, avgChangePercent: 0, volatility: 0 };
  }

  const current = prices[prices.length - 1];
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);

  let totalChange = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      totalChange += ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100;
    }
  }
  const avgChangePercent = prices.length > 1 ? totalChange / (prices.length - 1) : 0;

  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const volatility = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;

  return {
    current,
    lowest,
    highest,
    avgChangePercent: Math.round(avgChangePercent * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
  };
}

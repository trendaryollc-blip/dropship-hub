import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import type { MonitoringMetrics, MonitoredProduct } from "./types";

export async function computeMonitoringMetrics(uid: string): Promise<MonitoringMetrics> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("monitoredProducts").get();

    if (snap.empty) {
      return {
        totalMonitored: 0,
        inStock: 0,
        outOfStock: 0,
        unknown: 0,
        avgPriceChangePercent: 0,
        totalAlerts: 0,
        unreadAlerts: 0,
        priceDrops24h: 0,
        priceIncreases24h: 0,
        stockOutEvents24h: 0,
        lastCheckTime: null,
      };
    }

    const now = Date.now();
    const oneDayAgo = new Date(now - 86400000).toISOString();

    let inStock = 0;
    let outOfStock = 0;
    let unknown = 0;
    let totalAlerts = 0;
    let unreadAlerts = 0;
    let priceDrops24h = 0;
    let priceIncreases24h = 0;
    let stockOutEvents24h = 0;
    let latestCheck: string | null = null;
    let totalChangePercent = 0;
    let changeCount = 0;

    for (const doc of snap.docs) {
      const product = doc.data() as MonitoredProduct;

      if (product.stockStatus === "in_stock") inStock++;
      else if (product.stockStatus === "out_of_stock") outOfStock++;
      else unknown++;

      const alerts = product.alerts || [];
      totalAlerts += alerts.length;
      unreadAlerts += alerts.filter((a) => !a.read).length;

      for (const alert of alerts) {
        if (alert.createdAt >= oneDayAgo) {
          if (alert.type === "price_drop") priceDrops24h++;
          else if (alert.type === "price_increase") priceIncreases24h++;
          else if (alert.type === "out_of_stock") stockOutEvents24h++;
        }
      }

      if (product.lastChecked && (!latestCheck || product.lastChecked > latestCheck)) {
        latestCheck = product.lastChecked;
      }

      if (product.priceHistory && product.priceHistory.length >= 2) {
        const first = product.priceHistory[0].price;
        const last = product.priceHistory[product.priceHistory.length - 1].price;
        if (first > 0) {
          totalChangePercent += ((last - first) / first) * 100;
          changeCount++;
        }
      }
    }

    return {
      totalMonitored: snap.docs.length,
      inStock,
      outOfStock,
      unknown,
      avgPriceChangePercent: changeCount > 0 ? Math.round((totalChangePercent / changeCount) * 100) / 100 : 0,
      totalAlerts,
      unreadAlerts,
      priceDrops24h,
      priceIncreases24h,
      stockOutEvents24h,
      lastCheckTime: latestCheck,
    };
  } catch (err) {
    logger.error("Failed to compute monitoring metrics", { uid, error: err instanceof Error ? err.message : String(err) });
    return {
      totalMonitored: 0,
      inStock: 0,
      outOfStock: 0,
      unknown: 0,
      avgPriceChangePercent: 0,
      totalAlerts: 0,
      unreadAlerts: 0,
      priceDrops24h: 0,
      priceIncreases24h: 0,
      stockOutEvents24h: 0,
      lastCheckTime: null,
    };
  }
}

export async function getMonitoringHealth(uid: string): Promise<{
  status: "healthy" | "degraded" | "critical";
  lastCheckAge: number | null;
  productsNeedingAttention: number;
  recommendations: string[];
}> {
  const metrics = await computeMonitoringMetrics(uid);
  const recommendations: string[] = [];
  let productsNeedingAttention = 0;

  if (metrics.outOfStock > 0) {
    productsNeedingAttention += metrics.outOfStock;
    recommendations.push(`${metrics.outOfStock} product${metrics.outOfStock > 1 ? "s are" : " is"} out of stock. Consider delisting or finding alternatives.`);
  }

  if (metrics.unreadAlerts > 5) {
    recommendations.push(`${metrics.unreadAlerts} unread alerts. Review them to stay informed about price changes.`);
  }

  if (metrics.priceIncreases24h > 3) {
    recommendations.push(`${metrics.priceIncreases24h} price increases in 24h. Review repricing rules.`);
  }

  if (metrics.lastCheckTime) {
    const age = Date.now() - new Date(metrics.lastCheckTime).getTime();
    const ageHours = age / 3600000;

    if (ageHours > 6) {
      productsNeedingAttention++;
      recommendations.push(`Last price check was ${Math.round(ageHours)}h ago. Monitoring may be stale.`);
    }

    let status: "healthy" | "degraded" | "critical" = "healthy";
    if (ageHours > 12) status = "critical";
    else if (ageHours > 6 || metrics.outOfStock > 2) status = "degraded";

    return { status, lastCheckAge: age, productsNeedingAttention, recommendations };
  }

  return { status: "degraded", lastCheckAge: null, productsNeedingAttention, recommendations };
}

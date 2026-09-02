import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { withRetry } from "./retry";
import type { MonitoredProduct, NotificationPayload } from "./types";
import { dispatchNotifications } from "./notification-dispatcher";
import { autoDelistProduct } from "./delister";
import { appendPriceSnapshot } from "./price-history";

interface PriceCheckResult {
  price: number | null;
  inStock: boolean;
}

async function fetchPriceFromSource(sourceUrl: string, source: string): Promise<PriceCheckResult> {
  if (source === "cj") {
    const { getCJAccessToken } = await import("@/lib/cj-auth");
    const token = await getCJAccessToken();
    const pidMatch = sourceUrl.match(/product-p-(\d+)/);
    if (!pidMatch) return { price: null, inStock: true };

    const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${pidMatch[1]}`, {
      headers: { "CJ-Access-Token": token, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { price: null, inStock: true };
    const data = await res.json();
    const product = data.data;
    if (!product) return { price: null, inStock: true };

    const price = typeof product.sellPrice === "number" ? product.sellPrice : typeof product.productPrice === "number" ? product.productPrice : null;
    const inStock = product.stockQuantity === undefined || product.stockQuantity > 0;
    return { price, inStock };
  }

  const scraperKey = process.env.SCRAPER_API_KEY;
  if (scraperKey) {
    const params = new URLSearchParams({ api_key: scraperKey, url: sourceUrl, render: "true" });
    const res = await fetch(`https://api.scraperapi.com?${params}`, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return { price: null, inStock: true };

    const html = await res.text();
    const priceMatch = html.match(/\$[\d,]+\.?\d*/);
    const price = priceMatch ? parseFloat(priceMatch[0].replace(/[$,]/g, "")) : null;
    const outOfStockPatterns = /out of stock|sold out|unavailable|currently unavailable/i;
    const inStock = !outOfStockPatterns.test(html);
    return { price: price !== null && !isNaN(price) ? price : null, inStock };
  }

  return { price: null, inStock: true };
}

function generateAlerts(
  product: MonitoredProduct,
  newPrice: number | null,
  inStock: boolean,
  threshold: number
): NotificationPayload[] {
  const notifications: NotificationPayload[] = [];

  if (newPrice !== null && product.currentPrice > 0) {
    const diff = newPrice - product.currentPrice;
    const diffPercent = Math.abs(Math.round((diff / product.currentPrice) * 100));

    if (diff < 0 && diffPercent >= threshold) {
      notifications.push({
        type: "price_drop",
        productTitle: product.productTitle,
        productId: product.productId,
        oldPrice: product.currentPrice,
        newPrice,
        message: `Price dropped ${diffPercent}% from $${product.currentPrice.toFixed(2)} to $${newPrice.toFixed(2)}`,
      });
    } else if (diff > 0 && diffPercent >= threshold) {
      notifications.push({
        type: "price_increase",
        productTitle: product.productTitle,
        productId: product.productId,
        oldPrice: product.currentPrice,
        newPrice,
        message: `Price increased ${diffPercent}% from $${product.currentPrice.toFixed(2)} to $${newPrice.toFixed(2)}`,
      });
    }
  }

  if (product.stockStatus === "in_stock" && !inStock) {
    notifications.push({
      type: "out_of_stock",
      productTitle: product.productTitle,
      productId: product.productId,
      message: `${product.productTitle} is now out of stock at the supplier`,
    });
  } else if (product.stockStatus === "out_of_stock" && inStock) {
    notifications.push({
      type: "back_in_stock",
      productTitle: product.productTitle,
      productId: product.productId,
      message: `${product.productTitle} is back in stock at the supplier`,
    });
  }

  return notifications;
}

export async function runPriceCheckForUser(uid: string): Promise<{
  checked: number;
  priceChanged: number;
  stockChanged: number;
  alerts: number;
  errors: number;
}> {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.collection("monitoredProducts").get();

    if (snap.empty) {
      return { checked: 0, priceChanged: 0, stockChanged: 0, alerts: 0, errors: 0 };
    }

    let priceChanged = 0;
    let stockChanged = 0;
    let alertsCount = 0;
    let errors = 0;
    const allNotifications: NotificationPayload[] = [];
    const batch = db.batch();
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    for (const doc of snap.docs) {
      const product = doc.data() as MonitoredProduct;

      if (!product.sourceUrl) {
        batch.update(doc.ref, { lastChecked: now });
        continue;
      }

      try {
        const result = await withRetry(() => fetchPriceFromSource(product.sourceUrl, product.source));

        const freshSnap = await doc.ref.get();
        const freshProduct = freshSnap.data() as MonitoredProduct;
        const threshold = product.priceDropThreshold || 5;

        const notifications = generateAlerts(freshProduct, result.price, result.inStock, threshold);
        allNotifications.push(...notifications);

        const alerts = notifications.map((n, i) => ({
          id: `alert-${today}-${Date.now()}-${i}`,
          type: n.type,
          message: n.message,
          oldPrice: n.oldPrice,
          newPrice: n.newPrice,
          createdAt: now,
          read: false,
        }));

        const newStockStatus = result.inStock ? "in_stock" : "out_of_stock";
        if (newStockStatus !== freshProduct.stockStatus) stockChanged++;

        if (result.price !== null && result.price !== freshProduct.currentPrice) priceChanged++;

        const updateData: Record<string, unknown> = {
          lastChecked: now,
          alerts: [...(freshProduct.alerts || []), ...alerts],
        };

        if (result.price !== null) {
          updateData.currentPrice = result.price;
          updateData.lowestPrice = Math.min(freshProduct.lowestPrice || result.price, result.price);
          updateData.highestPrice = Math.max(freshProduct.highestPrice || result.price, result.price);

          const history = [...(freshProduct.priceHistory || [])];
          const lastEntry = history[history.length - 1];
          if (lastEntry && lastEntry.date === today) {
            lastEntry.price = result.price;
          } else {
            history.push({ date: today, price: result.price, source: "scrape" });
            if (history.length > 90) history.splice(0, history.length - 90);
          }
          updateData.priceHistory = history;
        }

        if (newStockStatus !== freshProduct.stockStatus) {
          updateData.stockStatus = newStockStatus;
        }

        batch.update(doc.ref, updateData);
        alertsCount += alerts.length;

        if (newStockStatus === "out_of_stock" && freshProduct.stockStatus === "in_stock" && product.autoDelist) {
          await autoDelistProduct(uid, doc.id, freshProduct).catch(() => {});
        }
      } catch {
        errors++;
        batch.update(doc.ref, { lastChecked: now });
      }
    }

    await batch.commit();

    if (allNotifications.length > 0) {
      await dispatchNotifications(uid, allNotifications).catch(() => {});
    }

    return { checked: snap.docs.length, priceChanged, stockChanged, alerts: alertsCount, errors };
  } catch (err) {
    logger.error("Price check failed for user", { uid, error: err instanceof Error ? err.message : String(err) });
    return { checked: 0, priceChanged: 0, stockChanged: 0, alerts: 0, errors: 1 };
  }
}

export async function runPriceCheckForProduct(uid: string, monitoredId: string): Promise<{
  priceChanged: boolean;
  stockChanged: boolean;
  newAlerts: number;
}> {
  try {
    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("monitoredProducts").doc(monitoredId);
    const doc = await docRef.get();

    if (!doc.exists) return { priceChanged: false, stockChanged: false, newAlerts: 0 };

    const product = doc.data() as MonitoredProduct;
    if (!product.sourceUrl) return { priceChanged: false, stockChanged: false, newAlerts: 0 };

    const result = await withRetry(() => fetchPriceFromSource(product.sourceUrl, product.source));
    const threshold = product.priceDropThreshold || 5;

    await appendPriceSnapshot(uid, monitoredId, {
      date: new Date().toISOString().split("T")[0],
      price: result.price || product.currentPrice,
      source: "scrape",
    });

    const notifications = generateAlerts(product, result.price, result.inStock, threshold);

    const newStockStatus = result.inStock ? "in_stock" : "out_of_stock";
    const priceChanged = result.price !== null && result.price !== product.currentPrice;
    const stockChanged = newStockStatus !== product.stockStatus;

    if (notifications.length > 0) {
      await dispatchNotifications(uid, notifications).catch(() => {});
    }

    if (stockChanged && newStockStatus === "out_of_stock" && product.autoDelist) {
      await autoDelistProduct(uid, monitoredId, product).catch(() => {});
    }

    return { priceChanged, stockChanged, newAlerts: notifications.length };
  } catch (err) {
    logger.error("Product price check failed", { uid, monitoredId, error: err instanceof Error ? err.message : String(err) });
    return { priceChanged: false, stockChanged: false, newAlerts: 0 };
  }
}

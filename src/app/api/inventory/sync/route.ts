import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";
import { withRetry } from "@/lib/monitoring/retry";
import { autoDelistProduct } from "@/lib/monitoring/delister";
import { appendPriceSnapshot } from "@/lib/monitoring/price-history";
import { dispatchNotifications } from "@/lib/monitoring/notification-dispatcher";
import type { MonitoredProduct, NotificationPayload } from "@/lib/monitoring/types";

// POST: Sync inventory for all monitored products
export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.collection("monitoredProducts").get();

    if (snap.empty) {
      return NextResponse.json({ synced: 0, message: "No products to sync" });
    }

    const results: Array<{ id: string; title: string; stockChanged: boolean; newStatus: string; priceChanged: boolean }> = [];
    const batch = db.batch();
    const now = new Date().toISOString();
    const today = now.split("T")[0];
    const allNotifications: NotificationPayload[] = [];

    for (const doc of snap.docs) {
      const product = doc.data() as MonitoredProduct;
      
      if (!product.sourceUrl) {
        results.push({ id: doc.id, title: product.productTitle, stockChanged: false, newStatus: product.stockStatus, priceChanged: false });
        continue;
      }

      let newStockStatus = product.stockStatus;
      let newPrice: number | null = null;
      let priceChanged = false;
      
      try {
        const scraperKey = process.env.SCRAPER_API_KEY;
        if (scraperKey) {
          const result = await withRetry(async () => {
            const params = new URLSearchParams({ api_key: scraperKey, url: product.sourceUrl, render: "true" });
            const res = await fetch(`https://api.scraperapi.com?${params}`, { signal: AbortSignal.timeout(30000) });
            if (!res.ok) throw new Error(`ScraperAPI ${res.status}`);
            const html = await res.text();

            const priceMatch = html.match(/\$[\d,]+\.?\d*/);
            const price = priceMatch ? parseFloat(priceMatch[0].replace(/[$,]/g, "")) : null;

            const outOfStockPatterns = /out of stock|sold out|unavailable|currently unavailable/i;
            const inStock = !outOfStockPatterns.test(html);

            return { price: price !== null && !isNaN(price) ? price : null, inStock };
          });

          newPrice = result.price;
          newStockStatus = result.inStock ? "in_stock" : "out_of_stock";
        }
      } catch {
        // Keep current status on error
      }

      const stockChanged = newStockStatus !== product.stockStatus;
      if (newPrice !== null && newPrice !== product.currentPrice) priceChanged = true;
      
      if (stockChanged || priceChanged) {
        const updates: Record<string, unknown> = { lastChecked: now };

        if (stockChanged) {
          updates.stockStatus = newStockStatus;
        }

        if (newPrice !== null) {
          updates.currentPrice = newPrice;
          updates.lowestPrice = Math.min(product.lowestPrice || newPrice, newPrice);
          updates.highestPrice = Math.max(product.highestPrice || newPrice, newPrice);
        }

        batch.update(doc.ref, updates);

        await appendPriceSnapshot(uid, doc.id, {
          date: today,
          price: newPrice || product.currentPrice,
          source: "scrape",
        });

        if (stockChanged && newStockStatus === "out_of_stock") {
          allNotifications.push({
            type: "out_of_stock",
            productTitle: product.productTitle,
            productId: product.productId,
            message: `${product.productTitle} is now out of stock at the supplier`,
          });

          if (product.autoDelist) {
            await autoDelistProduct(uid, doc.id, product).catch(() => {});
          }
        } else if (stockChanged && newStockStatus === "in_stock") {
          allNotifications.push({
            type: "back_in_stock",
            productTitle: product.productTitle,
            productId: product.productId,
            message: `${product.productTitle} is back in stock at the supplier`,
          });
        }

        if (priceChanged && newPrice !== null) {
          const threshold = product.priceDropThreshold || 5;
          const diff = newPrice - product.currentPrice;
          const diffPercent = Math.abs(Math.round((diff / product.currentPrice) * 100));

          if (diffPercent >= threshold) {
            allNotifications.push({
              type: diff < 0 ? "price_drop" : "price_increase",
              productTitle: product.productTitle,
              productId: product.productId,
              oldPrice: product.currentPrice,
              newPrice,
              message: `Price ${diff < 0 ? "dropped" : "increased"} ${diffPercent}% from $${product.currentPrice.toFixed(2)} to $${newPrice.toFixed(2)}`,
            });
          }
        }
      } else {
        batch.update(doc.ref, { lastChecked: now });
      }

      results.push({ id: doc.id, title: product.productTitle, stockChanged, newStatus: newStockStatus, priceChanged });
    }

    await batch.commit();

    if (allNotifications.length > 0) {
      await dispatchNotifications(uid, allNotifications).catch(() => {});
    }

    const changed = results.filter((r) => r.stockChanged);
    const priceChanges = results.filter((r) => r.priceChanged);
    return NextResponse.json({
      synced: results.length,
      changed: changed.length,
      priceChanges: priceChanges.length,
      notifications: allNotifications.length,
      results,
      message: `Synced ${results.length} products, ${changed.length} stock changes, ${priceChanges.length} price changes`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Inventory sync failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

// GET: Get sync status
export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.collection("monitoredProducts").get();

    const products = snap.docs.map((d) => {
      const data = d.data() as DocumentData;
      return {
        id: d.id,
        title: data.productTitle || "",
        stockStatus: data.stockStatus || "unknown",
        lastChecked: data.lastChecked || "",
        currentPrice: data.currentPrice || 0,
        priceDropThreshold: data.priceDropThreshold || 5,
        autoDelist: data.autoDelist || false,
      };
    });

    const inStock = products.filter((p) => p.stockStatus === "in_stock").length;
    const outOfStock = products.filter((p) => p.stockStatus === "out_of_stock").length;
    const unknown = products.filter((p) => p.stockStatus === "unknown").length;

    return NextResponse.json({
      total: products.length,
      inStock,
      outOfStock,
      unknown,
      products: products.slice(0, 50),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get sync status", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";

interface MonitoredProduct {
  productId: string;
  productTitle: string;
  source: string;
  sourceUrl: string;
  currentPrice: number;
  stockStatus: "in_stock" | "out_of_stock" | "unknown";
  alerts: Array<{ id: string; type: string; message: string; createdAt: string; read: boolean }>;
  priceHistory: { date: string; price: number }[];
  lowestPrice: number;
  highestPrice: number;
  lastChecked: string;
  repricingRule?: {
    type: "maintain_margin" | "undercut" | "fixed_price";
    value: number;
  };
}

async function fetchCurrentPrice(sourceUrl: string, source: string): Promise<{ price: number | null; inStock: boolean }> {
  try {
    const scraperKey = process.env.SCRAPER_API_KEY;

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
  } catch {
    return { price: null, inStock: true };
  }
}

function generatePriceAlert(
  product: MonitoredProduct,
  newPrice: number | null,
  inStock: boolean,
  today: string
): Array<{ id: string; type: string; message: string; createdAt: string; read: boolean }> {
  const newAlerts: Array<{ id: string; type: string; message: string; createdAt: string; read: boolean }> = [];
  const now = new Date().toISOString();

  if (newPrice !== null && product.currentPrice > 0) {
    const diff = newPrice - product.currentPrice;
    const diffPercent = Math.round((diff / product.currentPrice) * 100);

    if (diff < 0 && Math.abs(diffPercent) >= 2) {
      newAlerts.push({
        id: `price-drop-${today}-${Date.now()}`,
        type: "price_drop",
        message: `Price dropped from $${product.currentPrice.toFixed(2)} to $${newPrice.toFixed(2)} (${diffPercent}%)`,
        createdAt: now,
        read: false,
      });
    } else if (diff > 0 && diffPercent >= 2) {
      newAlerts.push({
        id: `price-increase-${today}-${Date.now()}`,
        type: "price_increase",
        message: `Price increased from $${product.currentPrice.toFixed(2)} to $${newPrice.toFixed(2)} (+${diffPercent}%)`,
        createdAt: now,
        read: false,
      });
    }
  }

  if (product.stockStatus === "in_stock" && !inStock) {
    newAlerts.push({
      id: `out-of-stock-${today}-${Date.now()}`,
      type: "out_of_stock",
      message: "Product is now out of stock at the supplier",
      createdAt: now,
      read: false,
    });
  } else if (product.stockStatus === "out_of_stock" && inStock) {
    newAlerts.push({
      id: `back-in-stock-${today}-${Date.now()}`,
      type: "back_in_stock",
      message: "Product is back in stock at the supplier",
      createdAt: now,
      read: false,
    });
  }

  return newAlerts;
}

// POST: Run automated stock/price check for all monitored products
export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.collection("monitoredProducts").get();

    if (snap.empty) {
      return NextResponse.json({ checked: 0, message: "No products to monitor" });
    }

    const results: Array<{ id: string; title: string; priceChanged: boolean; stockChanged: boolean; alerts: number }> = [];
    const batch = db.batch();
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    for (const doc of snap.docs) {
      const product = doc.data() as MonitoredProduct;

      if (!product.sourceUrl) {
        batch.update(doc.ref, { lastChecked: now });
        results.push({
          id: doc.id,
          title: product.productTitle,
          priceChanged: false,
          stockChanged: false,
          alerts: 0,
        });
        continue;
      }

      const { price: newPrice, inStock } = await fetchCurrentPrice(product.sourceUrl, product.source);

      const freshSnap = await doc.ref.get();
      const freshProduct = freshSnap.data() as MonitoredProduct;

      const newAlerts = generatePriceAlert(freshProduct, newPrice, inStock, today);
      const existingAlerts = freshProduct.alerts || [];
      const allAlerts = [...existingAlerts, ...newAlerts];

      const priceHistory = [...(freshProduct.priceHistory || [])];
      let priceChanged = false;
      let stockChanged = false;

      if (newPrice !== null && newPrice !== freshProduct.currentPrice) {
        priceChanged = true;
        const lastHistEntry = priceHistory[priceHistory.length - 1];
        if (lastHistEntry && lastHistEntry.date === today) {
          lastHistEntry.price = newPrice;
        } else {
          priceHistory.push({ date: today, price: newPrice });
          if (priceHistory.length > 90) priceHistory.splice(0, priceHistory.length - 90);
        }
      }

      const newStockStatus = inStock ? "in_stock" : "out_of_stock";
      if (newStockStatus !== freshProduct.stockStatus) {
        stockChanged = true;
      }

      const updateData: DocumentData = {
        lastChecked: now,
        alerts: allAlerts,
        priceHistory,
      };

      if (newPrice !== null) {
        updateData.currentPrice = newPrice;
        updateData.lowestPrice = Math.min(freshProduct.lowestPrice || newPrice, newPrice);
        updateData.highestPrice = Math.max(freshProduct.highestPrice || newPrice, newPrice);
      }

      if (stockChanged) {
        updateData.stockStatus = newStockStatus;
      }

      batch.update(doc.ref, updateData);

      results.push({
        id: doc.id,
        title: product.productTitle,
        priceChanged,
        stockChanged,
        alerts: newAlerts.length,
      });
    }

    await batch.commit();

    return NextResponse.json({
      checked: results.length,
      results,
      message: `Checked ${results.length} products`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Auto-check failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

// GET: Get monitoring settings/status
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
        currentPrice: data.currentPrice || 0,
        stockStatus: data.stockStatus || "unknown",
        lastChecked: data.lastChecked || "",
        alertCount: Array.isArray(data.alerts) ? data.alerts.filter((a: DocumentData) => !a.read).length : 0,
      };
    });

    const totalAlerts = products.reduce((sum, p) => sum + p.alertCount, 0);
    const outOfStock = products.filter((p) => p.stockStatus === "out_of_stock").length;

    return NextResponse.json({
      totalMonitored: products.length,
      totalAlerts,
      outOfStock,
      products: products.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get status", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

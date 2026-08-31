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
}

// POST: Sync inventory for all monitored products
export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.collection("monitoredProducts").get();

    if (snap.empty) {
      return NextResponse.json({ synced: 0, message: "No products to sync" });
    }

    const results: Array<{ id: string; title: string; stockChanged: boolean; newStatus: string }> = [];
    const batch = db.batch();
    const now = new Date().toISOString();

    for (const doc of snap.docs) {
      const product = doc.data() as MonitoredProduct;
      
      if (!product.sourceUrl) {
        results.push({ id: doc.id, title: product.productTitle, stockChanged: false, newStatus: product.stockStatus });
        continue;
      }

      // Check stock by scraping or API
      let newStockStatus = product.stockStatus;
      
      try {
        const scraperKey = process.env.SCRAPER_API_KEY;
        if (scraperKey) {
          const params = new URLSearchParams({ api_key: scraperKey, url: product.sourceUrl, render: "true" });
          const res = await fetch(`https://api.scraperapi.com?${params}`, { signal: AbortSignal.timeout(30000) });
          if (res.ok) {
            const html = await res.text();
            const outOfStockPatterns = /out of stock|sold out|unavailable|currently unavailable/i;
            newStockStatus = outOfStockPatterns.test(html) ? "out_of_stock" : "in_stock";
          }
        }
      } catch {
        // Keep current status on error
      }

      const stockChanged = newStockStatus !== product.stockStatus;
      
      if (stockChanged) {
        batch.update(doc.ref, {
          stockStatus: newStockStatus,
          lastChecked: now,
        });

        // Generate alert
        const alertRef = userRef.collection("alerts").doc();
        batch.set(alertRef, {
          type: newStockStatus === "out_of_stock" ? "out_of_stock" : "back_in_stock",
          title: newStockStatus === "out_of_stock" ? "Product Out of Stock" : "Product Back in Stock",
          description: `${product.productTitle} is now ${newStockStatus === "out_of_stock" ? "out of stock" : "back in stock"} at the supplier`,
          severity: newStockStatus === "out_of_stock" ? "high" : "medium",
          read: false,
          productId: product.productId,
          createdAt: now,
        });
      } else {
        batch.update(doc.ref, { lastChecked: now });
      }

      results.push({ id: doc.id, title: product.productTitle, stockChanged, newStatus: newStockStatus });
    }

    await batch.commit();

    const changed = results.filter((r) => r.stockChanged);
    return NextResponse.json({
      synced: results.length,
      changed: changed.length,
      results,
      message: `Synced ${results.length} products, ${changed.length} stock changes`,
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

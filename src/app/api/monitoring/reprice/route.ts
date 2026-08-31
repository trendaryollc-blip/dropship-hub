import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData, CollectionReference } from "firebase-admin/firestore";

interface RepricingRule {
  type: "maintain_margin" | "undercut" | "fixed_price";
  value: number; // margin %, undercut %, or fixed price
}

interface MonitoredProduct {
  productId: string;
  productTitle: string;
  source: string;
  currentPrice: number;
  repricingRule?: RepricingRule;
  storeConnections?: Array<{ storeId: string; platform: "shopify" | "woocommerce"; storeUrl: string; apiKey: string; apiSecret: string }>;
}

function calculateNewPrice(currentSupplierPrice: number, rule: RepricingRule, currentSellPrice?: number): number | null {
  switch (rule.type) {
    case "maintain_margin": {
      // rule.value is desired margin percentage
      const margin = rule.value / 100;
      return Math.round((currentSupplierPrice / (1 - margin)) * 100) / 100;
    }
    case "undercut": {
      // rule.value is percentage below current sell price
      if (!currentSellPrice || currentSellPrice <= 0) return null;
      const newPrice = currentSellPrice * (1 - rule.value / 100);
      return Math.round(Math.max(currentSupplierPrice * 1.05, newPrice) * 100) / 100; // Never below supplier cost + 5%
    }
    case "fixed_price": {
      return rule.value;
    }
    default:
      return null;
  }
}

async function updateShopifyPrice(
  storeUrl: string,
  apiKey: string,
  apiSecret: string,
  productId: string,
  newPrice: number
): Promise<boolean> {
  try {
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const res = await fetch(`${storeUrl}/admin/api/2024-01/products/${productId}.json`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        product: {
          variants: [{ price: newPrice.toFixed(2) }],
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function updateWooCommercePrice(
  storeUrl: string,
  apiKey: string,
  apiSecret: string,
  productId: string,
  newPrice: number
): Promise<boolean> {
  try {
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const res = await fetch(`${storeUrl}/wp-json/wc/v3/products/${productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        regular_price: newPrice.toFixed(2),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// POST: Execute repricing for products with price changes
export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);
    
    const { productIds } = await request.json() as { productIds?: string[] };
    
    const query = userRef.collection("monitoredProducts");
    if (productIds && productIds.length > 0) {
      // Only reprice specific products
      // Firestore doesn't support IN queries with more than 10 items
      const snap = await query.get();
      const filtered = snap.docs.filter((d) => productIds.includes(d.id));
      return processRepricing(db, userRef, filtered, uid);
    }
    
    // Reprice all products with repricing rules
    const snap = await query.where("repricingRule", "!=", null).get();
    return processRepricing(db, userRef, snap.docs, uid);
  } catch (error) {
    return NextResponse.json(
      { error: "Repricing failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

async function processRepricing(
  db: Awaited<ReturnType<typeof getAdminDB>>,
  userRef: { collection: (name: string) => CollectionReference<DocumentData> },
  docs: Array<{ id: string; data: () => DocumentData }>,
  uid: string
) {
  const results: Array<{
    productId: string;
    title: string;
    oldPrice: number;
    newPrice: number;
    storeUpdated: boolean;
    error?: string;
  }> = [];

  const batch = db.batch();

  for (const doc of docs) {
    const product = doc.data() as MonitoredProduct;
    if (!product.repricingRule || !product.currentPrice) continue;

    // Get the last known sell price from price history
    const sellPriceDoc = await db.collection("users").doc(uid).collection("monitoredProducts").doc(doc.id).collection("priceHistory").orderBy("date", "desc").limit(1).get();
    const lastSellPrice = sellPriceDoc.empty ? undefined : sellPriceDoc.docs[0].data().sellPrice;

    const newPrice = calculateNewPrice(product.currentPrice, product.repricingRule, lastSellPrice);
    if (!newPrice || newPrice === lastSellPrice) continue;

    let storeUpdated = false;

    // Update store listings if connected
    if (product.storeConnections && product.storeConnections.length > 0) {
      for (const conn of product.storeConnections) {
        if (conn.platform === "shopify") {
          storeUpdated = await updateShopifyPrice(conn.storeUrl, conn.apiKey, conn.apiSecret, product.productId, newPrice);
        } else if (conn.platform === "woocommerce") {
          storeUpdated = await updateWooCommercePrice(conn.storeUrl, conn.apiKey, conn.apiSecret, product.productId, newPrice);
        }
        if (storeUpdated) break;
      }
    }

    // Log the repricing event
    const historyRef = db.collection("users").doc(uid).collection("monitoredProducts").doc(doc.id).collection("priceHistory").doc();
    batch.set(historyRef, {
      date: new Date().toISOString().split("T")[0],
      sellPrice: newPrice,
      supplierPrice: product.currentPrice,
      type: "auto_reprice",
      storeUpdated,
    });

    // Add alert
    const alertRef = db.collection("users").doc(uid).collection("alerts").doc();
    batch.set(alertRef, {
      type: "reprice",
      title: "Auto-Repriced Product",
      description: `${product.productTitle} repriced to $${newPrice.toFixed(2)} (was $${lastSellPrice?.toFixed(2) || "N/A"})`,
      severity: "low",
      read: false,
      productId: product.productId,
      createdAt: new Date().toISOString(),
    });

    results.push({
      productId: doc.id,
      title: product.productTitle,
      oldPrice: lastSellPrice || 0,
      newPrice,
      storeUpdated,
    });
  }

  await batch.commit();

  return NextResponse.json({
    repriced: results.length,
    results,
    message: `Repriced ${results.length} products`,
  });
}

// GET: Get repricing rules and status
export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.collection("monitoredProducts").where("repricingRule", "!=", null).get();

    const products = snap.docs.map((d) => {
      const data = d.data() as DocumentData;
      const rule = data.repricingRule as RepricingRule | undefined;
      return {
        id: d.id,
        title: data.productTitle || "",
        currentPrice: data.currentPrice || 0,
        rule: rule || null,
        lastReprice: data.lastReprice || null,
      };
    });

    return NextResponse.json({ products, count: products.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get repricing status", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
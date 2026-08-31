import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";

interface MonitoredProduct {
  id?: string;
  productId: string;
  productTitle: string;
  productImage?: string;
  source: string;
  sourceUrl: string;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  lastChecked: string;
  priceHistory: { date: string; price: number }[];
  stockStatus: "in_stock" | "out_of_stock" | "unknown";
  alerts: PriceAlert[];
  repricingRule?: RepricingRule;
}

interface PriceAlert {
  id: string;
  type: "price_drop" | "price_increase" | "out_of_stock" | "back_in_stock";
  message: string;
  oldPrice?: number;
  newPrice?: number;
  createdAt: string;
  read: boolean;
}

interface RepricingRule {
  enabled: boolean;
  type: "margin_floor" | "undercut_competitor" | "fixedMarkup";
  value: number;
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "add") {
      const { productId, productTitle, productImage, source, sourceUrl, currentPrice } = body;
      if (!productId || !productTitle || currentPrice === undefined) {
        return NextResponse.json({ error: "productId, productTitle, and currentPrice are required" }, { status: 400 });
      }

      const db = await getAdminDB();
      const doc: Omit<MonitoredProduct, "id"> = {
        productId,
        productTitle,
        productImage: productImage || "",
        source: source || "unknown",
        sourceUrl: sourceUrl || "",
        currentPrice,
        lowestPrice: currentPrice,
        highestPrice: currentPrice,
        lastChecked: new Date().toISOString(),
        priceHistory: [{ date: new Date().toISOString().split("T")[0], price: currentPrice }],
        stockStatus: "in_stock",
        alerts: [],
      };

      const ref = await db.collection("users").doc(uid).collection("monitoredProducts").add(doc);
      return NextResponse.json({ success: true, id: ref.id, ...doc });
    }

    if (action === "updatePrice") {
      const { monitoredId, newPrice, stockStatus } = body;
      if (!monitoredId || newPrice === undefined) {
        return NextResponse.json({ error: "monitoredId and newPrice are required" }, { status: 400 });
      }

      const db = await getAdminDB();
      const docRef = db.collection("users").doc(uid).collection("monitoredProducts").doc(monitoredId);
      let newAlerts: PriceAlert[] = [];

      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(docRef);

        if (!snap.exists) {
          throw new Error("NOT_FOUND");
        }

        const product = snap.data() as MonitoredProduct;
        const today = new Date().toISOString().split("T")[0];
        const newHistory = [...product.priceHistory];
        const lastEntry = newHistory[newHistory.length - 1];

        if (lastEntry && lastEntry.date === today) {
          lastEntry.price = newPrice;
        } else {
          newHistory.push({ date: today, price: newPrice });
          if (newHistory.length > 90) newHistory.shift();
        }

        const alerts: PriceAlert[] = [...product.alerts];

        if (newPrice < product.currentPrice) {
          const dropPercent = Math.round(((product.currentPrice - newPrice) / product.currentPrice) * 100);
          alerts.push({
            id: `alert_${Date.now()}`,
            type: "price_drop",
            message: `Price dropped ${dropPercent}% from $${product.currentPrice.toFixed(2)} to $${newPrice.toFixed(2)}`,
            oldPrice: product.currentPrice,
            newPrice,
            createdAt: new Date().toISOString(),
            read: false,
          });
        } else if (newPrice > product.currentPrice) {
          const increasePercent = Math.round(((newPrice - product.currentPrice) / product.currentPrice) * 100);
          alerts.push({
            id: `alert_${Date.now()}`,
            type: "price_increase",
            message: `Price increased ${increasePercent}% from $${product.currentPrice.toFixed(2)} to $${newPrice.toFixed(2)}`,
            oldPrice: product.currentPrice,
            newPrice,
            createdAt: new Date().toISOString(),
            read: false,
          });
        }

        if (stockStatus && stockStatus !== product.stockStatus) {
          if (stockStatus === "out_of_stock" && product.stockStatus === "in_stock") {
            alerts.push({
              id: `alert_${Date.now()}`,
              type: "out_of_stock",
              message: `${product.productTitle} is now out of stock`,
              createdAt: new Date().toISOString(),
              read: false,
            });
          } else if (stockStatus === "in_stock" && product.stockStatus === "out_of_stock") {
            alerts.push({
              id: `alert_${Date.now()}`,
              type: "back_in_stock",
              message: `${product.productTitle} is back in stock`,
              createdAt: new Date().toISOString(),
              read: false,
            });
          }
        }

        transaction.update(docRef, {
          currentPrice: newPrice,
          lowestPrice: Math.min(product.lowestPrice, newPrice),
          highestPrice: Math.max(product.highestPrice, newPrice),
          lastChecked: new Date().toISOString(),
          priceHistory: newHistory,
          stockStatus: stockStatus || product.stockStatus,
          alerts,
        });

        newAlerts = alerts;
      });

      return NextResponse.json({ success: true, alerts: newAlerts.filter((a) => !a.read) });
    }

    if (action === "setRepricingRule") {
      const { monitoredId, rule } = body;
      if (!monitoredId || !rule) {
        return NextResponse.json({ error: "monitoredId and rule are required" }, { status: 400 });
      }

      const db = await getAdminDB();
      await db.collection("users").doc(uid).collection("monitoredProducts").doc(monitoredId).update({
        repricingRule: rule,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "remove") {
      const { monitoredId } = body;
      if (!monitoredId) {
        return NextResponse.json({ error: "monitoredId is required" }, { status: 400 });
      }

      const db = await getAdminDB();
      await db.collection("users").doc(uid).collection("monitoredProducts").doc(monitoredId).delete();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "list";

    const db = await getAdminDB();

    if (type === "alerts") {
      const snap = await db
        .collection("users")
        .doc(uid)
        .collection("monitoredProducts")
        .get();

      const allAlerts: Array<PriceAlert & { productTitle: string; productId: string }> = [];
      for (const doc of snap.docs) {
        const product = doc.data() as MonitoredProduct;
        for (const alert of product.alerts) {
          if (!alert.read) {
            allAlerts.push({ ...alert, productTitle: product.productTitle, productId: product.productId });
          }
        }
      }

      allAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return NextResponse.json({ alerts: allAlerts.slice(0, 50) });
    }

    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("monitoredProducts")
      .orderBy("lastChecked", "desc")
      .limit(100)
      .get();

    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { monitoredId, alertIds } = body;

    if (!monitoredId || !alertIds) {
      return NextResponse.json({ error: "monitoredId and alertIds required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("monitoredProducts").doc(monitoredId);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);

      if (!snap.exists) {
        throw new Error("NOT_FOUND");
      }

      const product = snap.data() as MonitoredProduct;
      const updatedAlerts = product.alerts.map((a) =>
        alertIds.includes(a.id) ? { ...a, read: true } : a
      );

      transaction.update(docRef, { alerts: updatedAlerts });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
});

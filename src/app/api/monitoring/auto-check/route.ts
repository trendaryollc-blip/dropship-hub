import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";
import { runPriceCheckForUser, runPriceCheckForProduct } from "@/lib/monitoring/scheduler";

// POST: Run automated stock/price check for all monitored products
export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { monitoredId } = body as { monitoredId?: string };

    if (monitoredId) {
      const result = await runPriceCheckForProduct(uid, monitoredId);
      return NextResponse.json({
        success: true,
        ...result,
        message: result.priceChanged || result.stockChanged
          ? `Price changed: ${result.priceChanged}, Stock changed: ${result.stockChanged}, Alerts: ${result.newAlerts}`
          : "No changes detected",
      });
    }

    const result = await runPriceCheckForUser(uid);
    return NextResponse.json({
      success: true,
      ...result,
      message: `Checked ${result.checked} products, ${result.priceChanged} price changes, ${result.stockChanged} stock changes, ${result.alerts} alerts, ${result.errors} errors`,
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
        priceDropThreshold: data.priceDropThreshold || 5,
        autoDelist: data.autoDelist || false,
        competitorUrls: data.competitorUrls || [],
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

import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";
import { safeNum, safeStr } from "@/lib/utils-helpers";

function safeDateParse(value: unknown): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  if (typeof value === "object" && value !== null && "seconds" in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return new Date(0);
}

interface CompetitorChange {
  id: string;
  competitorName: string;
  changeType: "price-drop" | "price-increase" | "new-listing" | "out-of-stock" | "rating-change" | "review-surge";
  severity: "info" | "warning" | "critical";
  product: string;
  oldValue: string;
  newValue: string;
  impact: string;
  recommendation: string;
  detectedAt: string;
}

interface CompetitorWatch {
  id: string;
  name: string;
  platforms: string[];
  lastChecked: string;
  changesDetected: number;
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    // Get watched competitors
    const watchSnap = await userRef
      .collection("watchlist")
      .where("type", "==", "competitor")
      .limit(10)
      .get();

    const competitorSearchSnap = await userRef
      .collection("competitorSearches")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const watches = watchSnap.docs.map((d) => d.data() as DocumentData);
    const searches = competitorSearchSnap.docs.map((d) => d.data() as DocumentData);

    // Extract product names from searches
    const watchedProducts = searches.map((s) => safeStr(s.query)).filter(Boolean);

    // Analyze real competitor data from Firestore
    const changes: CompetitorChange[] = [];

    // Build watch list from real watched competitors
    const watchList: CompetitorWatch[] = watches.map((w) => ({
      id: safeStr(w.itemId, "unknown"),
      name: safeStr(w.title, "Unknown Competitor"),
      platforms: Array.isArray(w.platforms) ? w.platforms : ["Multiple"],
      lastChecked: w.lastChecked ? safeDateParse(w.lastChecked).toISOString() : new Date().toISOString(),
      changesDetected: 0,
    }));

    // Check for price changes in monitored products
    const monitoredSnap = await userRef
      .collection("monitoredProducts")
      .limit(20)
      .get();

    for (const doc of monitoredSnap.docs) {
      const data = doc.data();
      const priceHistory = data.priceHistory || [];
      if (priceHistory.length < 2) continue;

      const latest = priceHistory[priceHistory.length - 1];
      const previous = priceHistory[priceHistory.length - 2];
      const latestPrice = safeNum(latest?.price);
      const previousPrice = safeNum(previous?.price);

      if (latestPrice === 0 || previousPrice === 0) continue;

      const changePercent = ((latestPrice - previousPrice) / previousPrice) * 100;

      if (Math.abs(changePercent) >= 2) {
        const isIncrease = changePercent > 0;
        changes.push({
          id: `monitored-${doc.id}`,
          competitorName: safeStr(data.source, "Supplier"),
          changeType: isIncrease ? "price-increase" : "price-drop",
          severity: isIncrease ? "info" : "warning",
          product: safeStr(data.title, "Unknown product"),
          oldValue: `$${previousPrice.toFixed(2)}`,
          newValue: `$${latestPrice.toFixed(2)}`,
          impact: isIncrease
            ? "Supplier price increased — your margin may be reduced"
            : "Supplier price decreased — opportunity to increase margin or undercut competitors",
          recommendation: isIncrease
            ? "Consider raising your retail price to maintain margin, or absorb the cost for competitive advantage"
            : "You can lower your retail price to undercut competitors, or keep the same price for higher margin",
          detectedAt: latest?.date ? new Date(latest.date).toISOString() : new Date().toISOString(),
        });
      }
    }

    // Check for out-of-stock items
    const pushedSnap = await userRef
      .collection("pushedProducts")
      .limit(20)
      .get();

    for (const doc of pushedSnap.docs) {
      const data = doc.data();
      if (data.stockStatus === "out_of_stock" || data.inStock === false) {
        changes.push({
          id: `oos-${doc.id}`,
          competitorName: safeStr(data.supplier, "Supplier"),
          changeType: "out-of-stock",
          severity: "critical",
          product: safeStr(data.title, "Unknown product"),
          oldValue: "In Stock",
          newValue: "Out of Stock",
          impact: "Your listing may generate orders you cannot fulfill",
          recommendation: "Delist this product or find an alternative supplier immediately",
          detectedAt: data.updatedAt ? safeDateParse(data.updatedAt).toISOString() : new Date().toISOString(),
        });
      }
    }

    // Sort by severity then date
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    changes.sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });

    return NextResponse.json({
      changes,
      watchList,
      summary: {
        totalChanges: changes.length,
        critical: changes.filter((c) => c.severity === "critical").length,
        warnings: changes.filter((c) => c.severity === "warning").length,
        opportunities: changes.filter((c) => c.changeType === "out-of-stock" || c.changeType === "price-drop").length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to monitor competitors", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

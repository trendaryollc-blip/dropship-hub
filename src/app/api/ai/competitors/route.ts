import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { DocumentData } from "firebase-admin/firestore";

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

function safeStr(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

// Simulated competitor monitoring data
function generateCompetitorChanges(watchedProducts: string[]): CompetitorChange[] {
  const changes: CompetitorChange[] = [];
  const competitors = ["TechGadget Store", "QuickShip Supplies", "PrimeDrop Co", "ValueMart Direct", "EliteProducts"];
  const products = watchedProducts.length > 0 ? watchedProducts : ["Wireless Earbuds", "LED Strip Lights", "Phone Mount", "Posture Corrector"];

  // Generate some realistic changes
  const changeTypes: CompetitorChange["changeType"][] = ["price-drop", "price-increase", "new-listing", "out-of-stock", "rating-change", "review-surge"];

  for (let i = 0; i < Math.min(5, products.length * 2); i++) {
    const changeType = changeTypes[Math.floor(Math.random() * changeTypes.length)];
    const competitor = competitors[Math.floor(Math.random() * competitors.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const basePrice = 15 + Math.random() * 30;

    let change: CompetitorChange;

    switch (changeType) {
      case "price-drop":
        const newPrice = (basePrice * (0.7 + Math.random() * 0.2)).toFixed(2);
        change = {
          id: `change-${i}`,
          competitorName: competitor,
          changeType: "price-drop",
          severity: "warning",
          product,
          oldValue: `$${basePrice.toFixed(2)}`,
          newValue: `$${newPrice}`,
          impact: "May reduce your competitive advantage",
          recommendation: `Consider matching the price or differentiating on value (bundle, warranty, faster shipping)`,
          detectedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        };
        break;
      case "price-increase":
        const increasedPrice = (basePrice * (1.1 + Math.random() * 0.15)).toFixed(2);
        change = {
          id: `change-${i}`,
          competitorName: competitor,
          changeType: "price-increase",
          severity: "info",
          product,
          oldValue: `$${basePrice.toFixed(2)}`,
          newValue: `$${increasedPrice}`,
          impact: "Opportunity to capture price-sensitive customers",
          recommendation: `You could maintain current pricing to gain market share, or raise slightly for better margins`,
          detectedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        };
        break;
      case "new-listing":
        change = {
          id: `change-${i}`,
          competitorName: competitor,
          changeType: "new-listing",
          severity: "warning",
          product: `New ${product} variant`,
          oldValue: "N/A",
          newValue: "Listed",
          impact: "Increased competition in your niche",
          recommendation: `Differentiate your listing with better images, description, or bundle offer`,
          detectedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        };
        break;
      case "out-of-stock":
        change = {
          id: `change-${i}`,
          competitorName: competitor,
          changeType: "out-of-stock",
          severity: "critical",
          product,
          oldValue: "In Stock",
          newValue: "Out of Stock",
          impact: "Potential to capture their customers",
          recommendation: `Run targeted ads for this product while competitor is out of stock — capture their demand`,
          detectedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        };
        break;
      case "rating-change":
        change = {
          id: `change-${i}`,
          competitorName: competitor,
          changeType: "rating-change",
          severity: "info",
          product,
          oldValue: "4.5 stars",
          newValue: "4.2 stars",
          impact: "Competitor quality declining — opportunity",
          recommendation: `Highlight your quality and customer reviews in marketing`,
          detectedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        };
        break;
      case "review-surge":
        change = {
          id: `change-${i}`,
          competitorName: competitor,
          changeType: "review-surge",
          severity: "info",
          product,
          oldValue: "150 reviews",
          newValue: "280 reviews",
          impact: "Competitor gaining social proof",
          recommendation: `Encourage more reviews from your customers or add review incentives`,
          detectedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        };
        break;
    }

    changes.push(change!);
  }

  return changes.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

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

    // Generate changes
    const changes = generateCompetitorChanges(watchedProducts);

    // Build watch list
    const watchList: CompetitorWatch[] = [
      ...watches.map((w) => ({
        id: safeStr(w.itemId, "unknown"),
        name: safeStr(w.title, "Unknown Competitor"),
        platforms: ["Multiple"],
        lastChecked: new Date().toISOString(),
        changesDetected: changes.filter((c) => c.competitorName === safeStr(w.title)).length,
      })),
    ];

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
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { DocumentData } from "firebase-admin/firestore";

interface AIMission {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
  category: string;
  impact: string;
  done: boolean;
  date: string;
  source: string;
}

function safeNum(val: unknown, fallback = 0): number {
  return typeof val === "number" ? val : fallback;
}

function safeStr(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

function generateMissionsFromData(
  revenue: DocumentData[],
  products: DocumentData[],
  supplierAlerts: DocumentData[],
  csConversations: DocumentData[],
  alerts: DocumentData[],
  storeConnections: DocumentData[],
  pushedProducts: DocumentData[],
  missions: DocumentData[],
): AIMission[] {
  const generated: AIMission[] = [];
  const today = new Date().toISOString().split("T")[0];
  let idCounter = 0;

  // Skip if missions already exist for today
  const existingToday = missions.filter((m) => safeStr(m.date) === today);
  if (existingToday.length >= 3) return [];

  // Revenue-based missions
  if (revenue.length > 0) {
    const todayRev = revenue
      .filter((e) => safeStr(e.date) === today)
      .reduce((s, e) => s + safeNum(e.amount), 0);

    if (todayRev === 0) {
      generated.push({
        id: `ai-${++idCounter}`,
        text: "Make your first sale today — check your trending products and run an ad campaign",
        priority: "high",
        category: "revenue",
        impact: "Direct revenue impact",
        done: false,
        date: today,
        source: "revenue-engine",
      });
    }
  }

  // Product lifecycle missions
  const saturationCount = products.filter((p) => safeStr(p.currentStage) === "saturation").length;
  const sunsetCount = products.filter((p) => safeStr(p.currentStage) === "sunset").length;

  if (saturationCount > 0) {
    generated.push({
      id: `ai-${++idCounter}`,
      text: `Review ${saturationCount} saturated product${saturationCount > 1 ? "s" : ""} — consider adjusting pricing or finding alternatives`,
      priority: "high",
      category: "products",
      impact: "Protect profit margins",
      done: false,
      date: today,
      source: "lifecycle-engine",
    });
  }

  if (sunsetCount > 0) {
    generated.push({
      id: `ai-${++idCounter}`,
      text: `${sunsetCount} product${sunsetCount > 1 ? "s" : ""} in sunset phase — research replacement products`,
      priority: "medium",
      category: "products",
      impact: "Revenue continuity",
      done: false,
      date: today,
      source: "lifecycle-engine",
    });
  }

  // Supplier missions
  const highAlertSuppliers = supplierAlerts.filter((a) => safeStr(a.severity) === "high");
  if (highAlertSuppliers.length > 0) {
    generated.push({
      id: `ai-${++idCounter}`,
      text: `Address supplier issue: ${safeStr(highAlertSuppliers[0].supplierName)} — ${safeStr(highAlertSuppliers[0].title)}`,
      priority: "high",
      category: "suppliers",
      impact: "Prevent fulfillment issues",
      done: false,
      date: today,
      source: "supplier-monitor",
    });
  }

  // CS missions
  const escalated = csConversations.filter((c) => safeStr(c.status) === "escalated");
  if (escalated.length > 0) {
    generated.push({
      id: `ai-${++idCounter}`,
      text: `Respond to ${escalated.length} escalated customer conversation${escalated.length > 1 ? "s" : ""}`,
      priority: "high",
      category: "customer-service",
      impact: "Customer retention",
      done: false,
      date: today,
      source: "cs-monitor",
    });
  }

  // Alert missions
  const unreadAlerts = alerts.filter((a) => a.read !== true);
  if (unreadAlerts.length > 3) {
    generated.push({
      id: `ai-${++idCounter}`,
      text: `Review ${unreadAlerts.length} unread alerts in your dashboard`,
      priority: "medium",
      category: "alerts",
      impact: "Stay informed",
      done: false,
      date: today,
      source: "alert-engine",
    });
  }

  // Store missions
  const erroredProducts = pushedProducts.filter((p) => safeStr(p.status) === "error");
  if (erroredProducts.length > 0) {
    generated.push({
      id: `ai-${++idCounter}`,
      text: `Fix ${erroredProducts.length} product push error${erroredProducts.length > 1 ? "s" : ""} in your store`,
      priority: "medium",
      category: "store",
      impact: "Product availability",
      done: false,
      date: today,
      source: "store-monitor",
    });
  }

  const connectedStores = storeConnections.filter((c) => safeStr(c.status) === "connected");
  if (connectedStores.length === 0) {
    generated.push({
      id: `ai-${++idCounter}`,
      text: "Connect your first store to start selling products",
      priority: "high",
      category: "setup",
      impact: "Enable sales",
      done: false,
      date: today,
      source: "setup-engine",
    });
  }

  // Always add a research mission
  generated.push({
    id: `ai-${++idCounter}`,
    text: "Spend 10 minutes researching new trending products in your niches",
    priority: "low",
    category: "research",
    impact: "Discover opportunities",
    done: false,
    date: today,
    source: "research-engine",
  });

  return generated.slice(0, 5); // Max 5 AI missions per day
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

    // Fetch all relevant data
    const [
      revenueSnap,
      productsSnap,
      supplierAlertsSnap,
      csSnap,
      alertsSnap,
      storeSnap,
      pushedSnap,
      missionsSnap,
    ] = await Promise.all([
      userRef.collection("revenue").orderBy("createdAt", "desc").limit(7).get(),
      userRef.collection("productLifecycle").limit(20).get(),
      userRef.collection("supplierAlerts").where("read", "==", false).limit(10).get(),
      userRef.collection("csConversations").limit(20).get(),
      userRef.collection("alerts").orderBy("createdAt", "desc").limit(20).get(),
      userRef.collection("storeConnections").get(),
      userRef.collection("pushedProducts").orderBy("pushedAt", "desc").limit(20).get(),
      userRef.collection("missions").orderBy("createdAt", "desc").limit(10).get(),
    ]);

    const revenue = revenueSnap.docs.map((d) => d.data() as DocumentData);
    const products = productsSnap.docs.map((d) => d.data() as DocumentData);
    const supplierAlerts = supplierAlertsSnap.docs.map((d) => d.data() as DocumentData);
    const csConversations = csSnap.docs.map((d) => d.data() as DocumentData);
    const alerts = alertsSnap.docs.map((d) => d.data() as DocumentData);
    const storeConnections = storeSnap.docs.map((d) => d.data() as DocumentData);
    const pushedProducts = pushedSnap.docs.map((d) => d.data() as DocumentData);
    const missions = missionsSnap.docs.map((d) => d.data() as DocumentData);

    const aiMissions = generateMissionsFromData(
      revenue, products, supplierAlerts, csConversations,
      alerts, storeConnections, pushedProducts, missions,
    );

    if (aiMissions.length === 0) {
      return NextResponse.json({ missions: [], message: "Already have enough missions today" });
    }

    // Save AI missions to Firestore
    const batch = db.batch();
    for (const mission of aiMissions) {
      const ref = userRef.collection("missions").doc();
      batch.set(ref, {
        text: mission.text,
        done: false,
        date: mission.date,
        aiGenerated: true,
        priority: mission.priority,
        category: mission.category,
        impact: mission.impact,
        source: mission.source,
        createdAt: new Date().toISOString(),
      });
    }
    await batch.commit();

    return NextResponse.json({
      missions: aiMissions,
      generated: aiMissions.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate missions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET: Fetch today's AI missions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const today = new Date().toISOString().split("T")[0];
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("missions")
      .where("date", "==", today)
      .orderBy("createdAt", "desc")
      .get();

    const missions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; aiGenerated?: boolean; done?: boolean; [key: string]: unknown }));
    const aiMissions = missions.filter((m) => m.aiGenerated === true);
    const completed = aiMissions.filter((m) => m.done).length;

    return NextResponse.json({
      missions: aiMissions,
      total: aiMissions.length,
      completed,
      completionRate: aiMissions.length > 0 ? Math.round((completed / aiMissions.length) * 100) : 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch missions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

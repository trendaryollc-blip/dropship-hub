import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";
import { safeNum, safeStr } from "@/lib/utils-helpers";

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

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
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
}, LIMITS.AI_CHAT);

// GET: Fetch today's AI missions
export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
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

    // Fetch full gamification stats
    const allMissionsSnap = await db
      .collection("users")
      .doc(uid)
      .collection("missions")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const allMissions = allMissionsSnap.docs.map((d) => d.data() as DocumentData);

    // Calculate total XP from completed missions
    const xpPerCategory: Record<string, number> = { revenue: 75, products: 60, suppliers: 50, "customer-service": 80, alerts: 40, store: 50, setup: 100, research: 30 };
    let totalXP = 0;
    for (const m of allMissions) {
      if (m.done === true) {
        totalXP += xpPerCategory[m.category as string] || 25;
      }
    }

    // Calculate streak (consecutive days with at least 1 completed mission)
    const daySet = new Set<string>();
    for (const m of allMissions) {
      if (m.done === true && m.date) daySet.add(m.date as string);
    }
    let streak = 0;
    const d = new Date();
    while (true) {
      const dateStr = d.toISOString().split("T")[0];
      if (daySet.has(dateStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    const level = Math.floor(totalXP / 500) + 1;
    const currentXP = totalXP % 500;
    const nextLevelXP = 500;

    return NextResponse.json({
      missions: aiMissions,
      total: aiMissions.length,
      completed,
      completionRate: aiMissions.length > 0 ? Math.round((completed / aiMissions.length) * 100) : 0,
      stats: { totalXP, level, currentXP, nextLevelXP, streak },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch missions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

// PATCH: Mark a mission as complete
export const PATCH = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { missionId } = body;

    if (!missionId) {
      return NextResponse.json({ error: "missionId is required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("missions").doc(missionId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    }

    const mission = snap.data() as DocumentData;
    if (mission.done) {
      return NextResponse.json({ success: true, message: "Already completed" });
    }

    await docRef.update({ done: true, completedAt: new Date().toISOString() });

    const xpPerCategory: Record<string, number> = { revenue: 75, products: 60, suppliers: 50, "customer-service": 80, alerts: 40, store: 50, setup: 100, research: 30 };
    const xpAwarded = xpPerCategory[mission.category as string] || 25;

    return NextResponse.json({ success: true, xpAwarded, category: mission.category });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to complete mission", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

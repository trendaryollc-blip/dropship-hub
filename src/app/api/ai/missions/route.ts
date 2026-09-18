import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";
import { safeNum, safeStr } from "@/lib/utils-helpers";
import {
  XP_PER_CATEGORY, calculateLevel, BADGE_DEFINITIONS,
  type GamificationStats, type MissionType, type BadgeContext,
} from "@/lib/data/missions";
import { safeErrorMessage } from "@/lib/api-errors";

interface AIMission {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
  category: string;
  impact: string;
  done: boolean;
  date: string;
  source: string;
  type: MissionType;
  progress: number;
  totalSteps: number;
  expiresAt?: string;
}

const XP_MULTIPLIER: Record<string, number> = {
  high: 1.5,
  medium: 1.0,
  low: 0.75,
};

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
        type: "daily",
        progress: 0,
        totalSteps: 1,
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
      type: "daily",
      progress: 0,
      totalSteps: saturationCount,
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
      type: "daily",
      progress: 0,
      totalSteps: sunsetCount,
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
      type: "daily",
      progress: 0,
      totalSteps: 1,
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
      type: "daily",
      progress: 0,
      totalSteps: escalated.length,
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
      type: "daily",
      progress: 0,
      totalSteps: unreadAlerts.length,
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
      type: "daily",
      progress: 0,
      totalSteps: erroredProducts.length,
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
      type: "daily",
      progress: 0,
      totalSteps: 1,
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
    type: "daily",
    progress: 0,
    totalSteps: 1,
  });

  // Weekly mission (add once on Monday or if none exist)
  const dayOfWeek = new Date().getDay();
  const existingWeekly = missions.filter((m) => safeStr(m.type) === "weekly");
  if (dayOfWeek === 1 || existingWeekly.length === 0) {
    generated.push({
      id: `ai-${++idCounter}`,
      text: "Complete 5 research missions this week to earn a weekly bonus",
      priority: "medium",
      category: "research",
      impact: "Weekly XP bonus",
      done: false,
      date: today,
      source: "weekly-engine",
      type: "weekly",
      progress: 0,
      totalSteps: 5,
      expiresAt: getNextSunday(),
    });
  }

  return generated.slice(0, 7); // Max 7 missions per generation
}

function getNextSunday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function computeStreak(completedDates: string[]): { streak: number; longestStreak: number } {
  const daySet = new Set(completedDates);
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
  let longestStreak = streak;
  const allDates = [...daySet].sort();
  let currentRun = 1;
  for (let i = 1; i < allDates.length; i++) {
    const prev = new Date(allDates[i - 1]);
    const curr = new Date(allDates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      currentRun++;
      longestStreak = Math.max(longestStreak, currentRun);
    } else {
      currentRun = 1;
    }
  }
  return { streak, longestStreak };
}

function checkBadges(
  stats: GamificationStats,
  bonusCount: number,
  diverseCategories: Set<string>,
): string[] {
  const newBadges: string[] = [];
  const ctx: BadgeContext = {
    stats,
    weeklyComplete: false,
    earlyBird: false,
    diverseCategories: diverseCategories.size >= 5,
    bonusCount,
  };
  for (const badge of BADGE_DEFINITIONS) {
    if (stats.badges.includes(badge.id)) continue;
    if (badge.requirement(ctx)) {
      newBadges.push(badge.id);
    }
  }
  return newBadges;
}

// POST: Generate missions (AI-powered or rule-based)
export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

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
        type: mission.type,
        progress: mission.progress,
        totalSteps: mission.totalSteps,
        expiresAt: mission.expiresAt || null,
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
      { error: "Failed to generate missions", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

// GET: Fetch missions and stats
export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const url = new URL(request.url);
    const view = url.searchParams.get("view") || "today";
    const today = new Date().toISOString().split("T")[0];

    if (view === "history") {
      const startDate = url.searchParams.get("startDate") || undefined;
      const endDate = url.searchParams.get("endDate") || today;
      const pageSize = parseInt(url.searchParams.get("pageSize") || "30", 10);

      let q = db.collection("users").doc(uid).collection("missions")
        .orderBy("createdAt", "desc")
        .limit(pageSize);
      if (startDate) q = q.where("date", ">=", startDate);
      if (endDate) q = q.where("date", "<=", endDate);

      const snap = await q.get();
      const allMissions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown> & { id: string }));

      const totalCompleted = allMissions.filter((m) => m.done === true).length;
      const totalXP = allMissions
        .filter((m) => m.done === true)
        .reduce((sum, m) => sum + (XP_PER_CATEGORY[m.category as string] || 25), 0);

      const categoryBreakdown: Record<string, { completed: number; xp: number }> = {};
      for (const m of allMissions) {
        if (m.done) {
          const cat = (m.category as string) || "unknown";
          if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { completed: 0, xp: 0 };
          categoryBreakdown[cat].completed++;
          categoryBreakdown[cat].xp += XP_PER_CATEGORY[cat] || 25;
        }
      }

      const dailyCompletionRates: Record<string, number> = {};
      const missionsByDate: Record<string, { total: number; completed: number }> = {};
      for (const m of allMissions) {
        const date = m.date as string;
        if (!missionsByDate[date]) missionsByDate[date] = { total: 0, completed: 0 };
        missionsByDate[date].total++;
        if (m.done) missionsByDate[date].completed++;
      }
      for (const [date, data] of Object.entries(missionsByDate)) {
        dailyCompletionRates[date] = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
      }

      return NextResponse.json({
        missions: allMissions,
        total: allMissions.length,
        totalCompleted,
        totalXP,
        categoryBreakdown,
        dailyCompletionRates,
      });
    }

    // Default: today's view
    const snap = await db
      .collection("users").doc(uid).collection("missions")
      .where("date", "==", today)
      .orderBy("createdAt", "desc")
      .get();

    const missions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const completed = missions.filter((m: DocumentData) => m.done === true).length;

    const allMissionsSnap = await db
      .collection("users").doc(uid).collection("missions")
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();

    const allMissions = allMissionsSnap.docs.map((d) => d.data() as DocumentData);

    let totalXP = 0;
    let totalMissionsCompleted = 0;
    const completedDates: string[] = [];
    let todayXP = 0;
    let weeklyXP = 0;
    let bonusMissionsCompleted = 0;
    const diverseCategories = new Set<string>();

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];

    for (const m of allMissions) {
      if (m.done === true) {
        const cat = m.category as string || "unknown";
        const xp = XP_PER_CATEGORY[cat] || 25;
        totalXP += xp;
        totalMissionsCompleted++;
        if (m.date) completedDates.push(m.date as string);
        if (m.date === today) todayXP += xp;
        if (m.date && m.date >= weekStartStr) weeklyXP += xp;
        diverseCategories.add(cat);
        if ((m.type as string) === "bonus") bonusMissionsCompleted++;
      }
    }

    const { streak, longestStreak } = computeStreak(completedDates);
    const { level, currentXP, nextLevelXP } = calculateLevel(totalXP);

    // Get existing badges
    const statsDoc = await db.collection("users").doc(uid).collection("gamification").doc("stats").get();
    const existingBadges: string[] = statsDoc.exists ? (statsDoc.data()?.badges || []) : [];

    const partialStats: GamificationStats = {
      totalXP, level, currentXP, nextLevelXP, streak, longestStreak,
      totalMissionsCompleted, badges: existingBadges, weeklyXP, todayXP,
    };

    const newBadges = checkBadges(partialStats, bonusMissionsCompleted, diverseCategories);
    const allBadges = [...new Set([...existingBadges, ...newBadges])];

    // Save updated gamification stats
    const finalStats: GamificationStats = {
      ...partialStats, badges: allBadges,
    };
    await db.collection("users").doc(uid).collection("gamification").doc("stats").set(finalStats);

    // Award badge XP (50 XP per new badge)
    if (newBadges.length > 0) {
      const badgeBatch = db.batch();
      for (const badgeId of newBadges) {
        const badge = BADGE_DEFINITIONS.find((b) => b.id === badgeId);
        if (badge) {
          const ref = db.collection("users").doc(uid).collection("missions").doc();
          badgeBatch.set(ref, {
            text: `Badge earned: ${badge.name}`,
            done: true,
            date: today,
            aiGenerated: false,
            priority: "high",
            category: "achievement",
            impact: badge.description,
            source: "badge-engine",
            type: "achievement",
            progress: 1,
            totalSteps: 1,
            xpAwarded: 50,
            completedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          });
        }
      }
      await badgeBatch.commit();
      finalStats.totalXP += newBadges.length * 50;
      const updated = calculateLevel(finalStats.totalXP);
      finalStats.level = updated.level;
      finalStats.currentXP = updated.currentXP;
      finalStats.nextLevelXP = updated.nextLevelXP;
      await db.collection("users").doc(uid).collection("gamification").doc("stats").set(finalStats);
    }

    const visibleMissions = missions.filter((m: DocumentData) => m.deleted !== true);
    return NextResponse.json({
      missions: visibleMissions,
      total: visibleMissions.length,
      completed,
      completionRate: missions.length > 0 ? Math.round((completed / missions.length) * 100) : 0,
      stats: finalStats,
      newBadges,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch missions", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

// PATCH: Complete mission, update progress, or create custom mission
export const PATCH = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { missionId, action, progress, totalSteps, text, priority, category, type } = body;

    const db = await getAdminDB();

    // Create custom mission
    if (action === "create" && text) {
      const today = new Date().toISOString().split("T")[0];
      const ref = db.collection("users").doc(uid).collection("missions").doc();
      await ref.set({
        text,
        done: false,
        date: today,
        aiGenerated: false,
        priority: priority || "medium",
        category: category || "custom",
        impact: "Custom mission",
        source: "manual",
        type: type || "daily",
        progress: 0,
        totalSteps: totalSteps || 1,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, missionId: ref.id });
    }

    // Update progress
    if (action === "progress" && missionId && typeof progress === "number") {
      const docRef = db.collection("users").doc(uid).collection("missions").doc(missionId);
      const snap = await docRef.get();
      if (!snap.exists) {
        return NextResponse.json({ error: "Mission not found" }, { status: 404 });
      }
      const mission = snap.data() as DocumentData;
      const total = mission.totalSteps || 1;
      const clampedProgress = Math.min(progress, total);
      const done = clampedProgress >= total;

      await docRef.update({
        progress: clampedProgress,
        totalSteps: total,
        ...(done ? { done: true, completedAt: new Date().toISOString() } : {}),
      });

      const cat = mission.category as string || "unknown";
      const xpAwarded = done ? Math.round((XP_PER_CATEGORY[cat] || 25) * (XP_MULTIPLIER[mission.priority as string] || 1)) : 0;

      return NextResponse.json({ success: true, progress: clampedProgress, totalSteps: total, done, xpAwarded });
    }

    // Delete mission
    if (action === "delete" && missionId) {
      await db.collection("users").doc(uid).collection("missions").doc(missionId).update({ deleted: true });
      return NextResponse.json({ success: true });
    }

    // Default: complete mission
    if (!missionId) {
      return NextResponse.json({ error: "missionId is required" }, { status: 400 });
    }

    const docRef = db.collection("users").doc(uid).collection("missions").doc(missionId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    }

    const mission = snap.data() as DocumentData;
    if (mission.done) {
      return NextResponse.json({ success: true, message: "Already completed", xpAwarded: 0 });
    }

    const cat = mission.category as string || "unknown";
    const baseXP = XP_PER_CATEGORY[cat] || 25;
    const multiplier = XP_MULTIPLIER[mission.priority as string] || 1;
    const xpAwarded = Math.round(baseXP * multiplier);

    await docRef.update({
      done: true,
      completedAt: new Date().toISOString(),
      progress: mission.totalSteps || 1,
      xpAwarded,
    });

    return NextResponse.json({ success: true, xpAwarded, category: cat });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to complete mission", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

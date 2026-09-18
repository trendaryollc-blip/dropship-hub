import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { safeErrorMessage } from "@/lib/api-errors";

export const GET = requireOwner(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    // Count users
    const usersSnapshot = await db.collection("users").count().get();
    const totalUsers = usersSnapshot.data().count;

    // Count active subscriptions
    let activeSubscriptions = 0;
    let activeSubscriptionsEstimated = false;
    try {
      const subsSnapshot = await db.collectionGroup("settings")
        .where("tier", "in", ["pro", "enterprise"])
        .where("status", "==", "active")
        .count()
        .get();
      activeSubscriptions = subsSnapshot.data().count;
    } catch {
      // Fallback: rough estimate from the users collection (flagged below)
      try {
        const proUsers = await db.collection("users").count().get();
        activeSubscriptions = Math.floor(proUsers.data().count * 0.1);
        activeSubscriptionsEstimated = true;
      } catch { /* ignore */ }
    }

    // Count platforms
    const platformsSnapshot = await db.collection("platforms").count().get();
    const totalPlatforms = platformsSnapshot.data().count;

    // Count healthy platforms
    let healthyPlatforms = 0;
    let healthyPlatformsEstimated = false;
    try {
      const healthySnapshot = await db.collection("platforms")
        .where("lastHealth", "==", "healthy")
        .count()
        .get();
      healthyPlatforms = healthySnapshot.data().count;
    } catch {
      healthyPlatforms = totalPlatforms;
      healthyPlatformsEstimated = true;
    }

    // Count total API keys across all platforms
    let totalApiKeys = 0;
    try {
      const platformsDocs = await db.collection("platforms").get();
      for (const doc of platformsDocs.docs) {
        const data = doc.data();
        if (Array.isArray(data.keys)) {
          totalApiKeys += data.keys.length;
        }
      }
    } catch { /* ignore */ }

    // Rough revenue estimate: average $49/plan. Always flagged as an
    // estimate so the admin UI never presents it as real revenue.
    const monthlyRevenue = activeSubscriptions * 49;

    return NextResponse.json({
      totalUsers,
      activeSubscriptions,
      totalPlatforms,
      healthyPlatforms,
      totalApiKeys,
      monthlyRevenue,
      estimates: {
        activeSubscriptions: activeSubscriptionsEstimated,
        healthyPlatforms: healthyPlatformsEstimated,
        monthlyRevenue: true,
      },
    });
  } catch (error) {
    console.error("[AdminStats] Error:", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to fetch stats") },
      { status: 500 }
    );
  }
});

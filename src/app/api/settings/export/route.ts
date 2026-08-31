import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

const COLLECTIONS_TO_EXPORT = [
  "favorites", "calcHistory", "chatHistory", "notes", "revenue",
  "alerts", "missions", "watchlist", "searchHistory", "competitorSearches",
  "enrichmentCache", "digests", "costProfiles", "storeConnections",
  "pushedProducts", "profitEntries", "supplierPerformance", "supplierAlerts",
  "productLifecycle", "lifecycleSnapshots", "lifecycleAlerts",
  "csConversations", "csMessages", "csTemplates", "routingDecisions",
  "routingPreferences", "savedProducts", "monitoredProducts", "notifications",
];

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);
    const exportData: Record<string, unknown> = { _exportedAt: new Date().toISOString(), _userId: uid };

    for (const coll of COLLECTIONS_TO_EXPORT) {
      try {
        const snap = await userRef.collection(coll).limit(500).get();
        exportData[coll] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch {
        exportData[coll] = [];
      }
    }

    // Also export user profile
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      exportData._profile = userDoc.data();
    }

    return NextResponse.json(exportData);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

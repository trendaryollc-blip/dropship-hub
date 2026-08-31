import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB, getAdminAuth } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

async function deleteCollectionCompletely(userRef: FirebaseFirestore.DocumentReference, collName: string, db: FirebaseFirestore.Firestore) {
  const BATCH_SIZE = 500;
  let deleted = BATCH_SIZE;
  while (deleted === BATCH_SIZE) {
    const snap = await userRef.collection(collName).limit(BATCH_SIZE).get();
    deleted = snap.size;
    if (deleted === 0) break;
    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    const subcollections = [
      "favorites", "calcHistory", "chatHistory", "notes", "revenue",
      "alerts", "missions", "watchlist", "searchHistory", "competitorSearches",
      "enrichmentCache", "digests", "costProfiles", "storeConnections",
      "pushedProducts", "profitEntries", "supplierPerformance", "supplierAlerts",
      "productLifecycle", "lifecycleSnapshots", "lifecycleAlerts",
      "csConversations", "csMessages", "csTemplates", "routingDecisions",
      "routingPreferences", "savedProducts", "monitoredProducts", "notifications",
      "settings", "dailyBriefings", "productSuppliers",
    ];

    for (const coll of subcollections) {
      await deleteCollectionCompletely(userRef, coll, db);
    }

    // Delete user document
    await userRef.delete();

    // Delete Firebase Auth user
    try {
      const adminAuth = getAdminAuth();
      await adminAuth.deleteUser(uid);
    } catch {
      // Auth user deletion may fail if called from client — that's OK
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

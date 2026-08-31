import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

const COLLECTIONS_TO_IMPORT = [
  "favorites", "calcHistory", "notes", "revenue",
  "alerts", "missions", "watchlist", "searchHistory",
  "costProfiles", "savedProducts", "monitoredProducts", "notifications",
];

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "data object required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);
    let imported = 0;

    for (const coll of COLLECTIONS_TO_IMPORT) {
      const items = data[coll];
      if (!Array.isArray(items)) continue;

      const BATCH_SIZE = 450;
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = items.slice(i, i + BATCH_SIZE);
        let batchCount = 0;

        for (const item of chunk) {
          const { id, ...rest } = item;
          if (!id) continue;
          batch.set(userRef.collection(coll).doc(id), rest, { merge: true });
          batchCount++;
          imported++;
        }

        if (batchCount > 0) {
          await batch.commit();
        }
      }
    }

    return NextResponse.json({ success: true, imported });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

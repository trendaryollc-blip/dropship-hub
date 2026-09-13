import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

const COLLECTION = "notifications";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snapshot = await db
      .collection("users").doc(uid).collection(COLLECTION)
      .where("read", "==", false)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    const now = new Date().toISOString();
    const batch = db.batch();

    for (const doc of snapshot.docs) {
      batch.update(doc.ref, { read: true, readAt: now });
    }

    await batch.commit();

    return NextResponse.json({ success: true, updated: snapshot.size });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to mark all as read", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.NOTIFICATIONS);

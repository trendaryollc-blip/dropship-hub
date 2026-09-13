import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

const COLLECTION = "notifications";

export const PATCH = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const parts = req.nextUrl.pathname.split("/");
    const notificationId = parts[parts.length - 1];

    if (!notificationId || notificationId === "notifications") {
      return NextResponse.json({ error: "notificationId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection(COLLECTION).doc(notificationId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    await docRef.update({ read: true, readAt: now });

    const updated = await docRef.get();
    return NextResponse.json({ success: true, notification: { id: updated.id, ...updated.data() } });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update notification", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.NOTIFICATIONS);

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const parts = req.nextUrl.pathname.split("/");
    const notificationId = parts[parts.length - 1];

    if (!notificationId || notificationId === "notifications") {
      return NextResponse.json({ error: "notificationId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection(COLLECTION).doc(notificationId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete notification", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.NOTIFICATIONS);

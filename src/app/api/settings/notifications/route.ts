import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("settings").doc("notifications").get();
    const preferences = snap.exists ? snap.data() : {
      priceAlerts: true,
      stockAlerts: true,
      orderUpdates: true,
      aiRecommendations: true,
      weeklyDigest: true,
    };
    return NextResponse.json({ preferences });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { preferences } = body;
    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json({ error: "preferences object required" }, { status: 400 });
    }
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("settings").doc("notifications").set(preferences, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

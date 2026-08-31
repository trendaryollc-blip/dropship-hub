import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { DEFAULT_FULFILLMENT_SETTINGS } from "@/types/fulfillment";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const doc = await db.collection("users").doc(uid).collection("fulfillmentSettings").doc("config").get();
    const settings = doc.exists ? { ...DEFAULT_FULFILLMENT_SETTINGS, ...doc.data() } : DEFAULT_FULFILLMENT_SETTINGS;
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.FULFILLMENT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { settings } = body;
    if (!settings) return NextResponse.json({ error: "settings required" }, { status: 400 });

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("fulfillmentSettings").doc("config").set(settings, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save settings", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.FULFILLMENT);

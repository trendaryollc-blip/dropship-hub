import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";

const SETTINGS_COLLECTION = "userSettings";

export const GET = withAuth(async (req, uid) => {
  try {
    const db = await getAdminDB();
    const doc = await db.collection(SETTINGS_COLLECTION).doc(uid).get();
    const data = doc.data();
    return NextResponse.json({ layout: data?.dashboardLayout ?? null });
  } catch (error) {
    console.error("[dashboard-layout GET]", error);
    return NextResponse.json({ layout: null });
  }
});

export const PUT = withAuth(async (req, uid) => {
  try {
    const { layout } = await req.json();
    if (!Array.isArray(layout)) {
      return NextResponse.json({ error: "Invalid layout" }, { status: 400 });
    }

    const db = await getAdminDB();
    await db
      .collection(SETTINGS_COLLECTION)
      .doc(uid)
      .set({ dashboardLayout: layout }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[dashboard-layout PUT]", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
});

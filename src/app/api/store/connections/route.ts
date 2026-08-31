import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { StoreConnectionSchema, StoreConnectionUpdateSchema, validateBody } from "@/lib/validation";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("storeConnections").orderBy("connectedAt", "desc").get();
    const connections = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ connections });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch connections", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const validation = validateBody(StoreConnectionSchema, body);
    if (!validation.success) return validation.response;
    const store = validation.data;

    const db = await getAdminDB();
    const ref = await db.collection("users").doc(uid).collection("storeConnections").add({
      ...store,
      status: "connected",
      connectedAt: new Date().toISOString(),
    });

    return NextResponse.json({ id: ref.id, ...store, status: "connected" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add connection", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const storeId = req.nextUrl.searchParams.get("storeId");
    if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete connection", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const PUT = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { storeId, ...updates } = body;
    if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

    const validation = validateBody(StoreConnectionUpdateSchema, updates);
    if (!validation.success) return validation.response;

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).update(validation.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update connection", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

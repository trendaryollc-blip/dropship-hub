import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get("uid");
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("storeConnections").orderBy("connectedAt", "desc").get();
    const connections = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ connections });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch connections", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, ...store } = body;
    if (!uid || !store.platform || !store.name) {
      return NextResponse.json({ error: "uid, platform, and name are required" }, { status: 400 });
    }

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
}

export async function DELETE(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get("uid");
    const storeId = req.nextUrl.searchParams.get("storeId");
    if (!uid || !storeId) return NextResponse.json({ error: "uid and storeId required" }, { status: 400 });

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete connection", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, storeId, ...updates } = body;
    if (!uid || !storeId) return NextResponse.json({ error: "uid and storeId required" }, { status: 400 });

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).update(updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update connection", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}

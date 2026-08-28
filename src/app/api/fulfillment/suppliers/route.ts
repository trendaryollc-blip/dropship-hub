import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get("uid");
    const productId = req.nextUrl.searchParams.get("productId");
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

    const db = await getAdminDB();

    if (productId) {
      const doc = await db.collection("users").doc(uid).collection("productSuppliers").doc(productId).get();
      return NextResponse.json({ assignment: doc.exists ? doc.data() : null });
    }

    const snap = await db.collection("users").doc(uid).collection("productSuppliers").get();
    const assignments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ assignments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch supplier assignments", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, productId, supplierId, supplierName, unitCost, shippingCost, source } = body;
    if (!uid || !productId || !supplierId) {
      return NextResponse.json({ error: "uid, productId, and supplierId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("productSuppliers").doc(productId).set({
      productId,
      supplierId,
      supplierName,
      unitCost: unitCost || 0,
      shippingCost: shippingCost || 0,
      source: source || "manual",
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save supplier assignment", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get("uid");
    const productId = req.nextUrl.searchParams.get("productId");
    if (!uid || !productId) return NextResponse.json({ error: "uid and productId required" }, { status: 400 });

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("productSuppliers").doc(productId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete supplier assignment", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}

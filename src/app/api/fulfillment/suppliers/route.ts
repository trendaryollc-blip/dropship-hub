import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

function sanitizeProductId(id: string): string {
  return id.replace(/\//g, "__SLASH__");
}

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const productId = req.nextUrl.searchParams.get("productId");

    const db = await getAdminDB();

    if (productId) {
      const docId = sanitizeProductId(productId);
      const doc = await db.collection("users").doc(uid).collection("productSuppliers").doc(docId).get();
      return NextResponse.json({ assignment: doc.exists ? doc.data() : null });
    }

    const snap = await db.collection("users").doc(uid).collection("productSuppliers").get();
    const assignments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ assignments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch supplier assignments", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.FULFILLMENT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { productId, supplierId, supplierName, unitCost, shippingCost, source } = body;
    if (!productId || !supplierId) {
      return NextResponse.json({ error: "productId and supplierId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docId = sanitizeProductId(productId);
    await db.collection("users").doc(uid).collection("productSuppliers").doc(docId).set({
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
}, LIMITS.FULFILLMENT);

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const productId = req.nextUrl.searchParams.get("productId");
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

    const db = await getAdminDB();
    const docId = sanitizeProductId(productId);
    await db.collection("users").doc(uid).collection("productSuppliers").doc(docId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete supplier assignment", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.FULFILLMENT);

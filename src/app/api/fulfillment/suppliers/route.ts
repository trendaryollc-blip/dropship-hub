import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/api-errors";
import { upsertDirectorySupplier, directoryEntryFromAssignment } from "@/lib/suppliers/directory";

function sanitizeProductId(id: string): string {
  return id.replace(/\//g, "__SLASH__");
}

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const productId = req.nextUrl.searchParams.get("productId");
    const view = req.nextUrl.searchParams.get("view");

    const db = await getAdminDB();

    // ?view=directory — every supplier this account has discovered or chosen,
    // merged into one stable row per supplier.
    if (view === "directory") {
      interface DirectoryRow {
        id: string;
        lastSeenAt?: unknown;
        [field: string]: unknown;
      }
      const snap = await db.collection("users").doc(uid).collection("supplierDirectory").get();
      const directory = snap.docs
        .map((d): DirectoryRow => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
        .sort((a, b) => String(b.lastSeenAt ?? "").localeCompare(String(a.lastSeenAt ?? "")))
        .slice(0, 100);
      return NextResponse.json({ directory });
    }

    if (productId) {
      const docId = sanitizeProductId(productId);
      const doc = await db.collection("users").doc(uid).collection("productSuppliers").doc(docId).get();
      return NextResponse.json({ assignment: doc.exists ? doc.data() : null });
    }

    const snap = await db.collection("users").doc(uid).collection("productSuppliers").get();
    const assignments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ assignments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch supplier assignments", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.FULFILLMENT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { productId, supplierId, supplierName, unitCost, shippingCost, source, confidence, candidates, needsAttention, matchReasons, platformId, storeUrl, productUrl, dataSource } = body;
    if (!productId || !supplierId) {
      return NextResponse.json({ error: "productId and supplierId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docId = sanitizeProductId(productId);
    await db.collection("users").doc(uid).collection("productSuppliers").doc(docId).set({
      productId,
      supplierId,
      supplierName,
      selectedSupplierId: supplierId,
      selectedSupplierName: supplierName,
      unitCost: unitCost || 0,
      shippingCost: shippingCost || 0,
      source: source || "manual",
      confidence: typeof confidence === "number" ? confidence : null,
      ...(Array.isArray(candidates) ? { candidates } : {}),
      ...(typeof needsAttention === "boolean" ? { needsAttention } : {}),
      ...(Array.isArray(matchReasons) ? { matchReasons } : {}),
      ...(typeof platformId === "string" ? { platformId } : {}),
      ...(typeof storeUrl === "string" ? { storeUrl } : {}),
      ...(typeof productUrl === "string" ? { productUrl } : {}),
      ...(dataSource === "live" || dataSource === "estimated" ? { dataSource } : {}),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Persist the supplier into the user's directory so observed performance
    // accumulates against a stable id. Best-effort — never block the selection.
    try {
      await upsertDirectorySupplier(
        db,
        uid,
        directoryEntryFromAssignment(
          { supplierId, supplierName, platformId, storeUrl, unitCost, dataSource },
          source === "auto_accepted" || source === "auto" ? "auto-link" : "manual-selection"
        )
      );
    } catch {
      // directory persistence is best-effort
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save supplier assignment", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
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
    return NextResponse.json({ error: "Failed to delete supplier assignment", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.FULFILLMENT);

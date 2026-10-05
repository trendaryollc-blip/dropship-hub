import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/api-errors";
import { AUTO_LINK_CONFIDENCE, type NormalizedSupplierOffer } from "@/types/supplier-offers";

function sanitizeProductId(id: string): string {
  return id.replace(/\//g, "__SLASH__");
}

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { productId, offer, confidence } = body as {
      productId?: string;
      offer?: NormalizedSupplierOffer;
      confidence?: number;
    };
    if (!productId || !offer?.supplierId) {
      return NextResponse.json({ error: "productId and offer.supplierId required" }, { status: 400 });
    }
    const score = typeof confidence === "number" ? confidence : offer.confidence;
    if (!(score >= AUTO_LINK_CONFIDENCE)) {
      return NextResponse.json(
        { error: `confidence ${score} below auto-link threshold ${AUTO_LINK_CONFIDENCE}` },
        { status: 422 }
      );
    }

    const db = await getAdminDB();
    const docId = sanitizeProductId(productId);
    await db
      .collection("users")
      .doc(uid)
      .collection("productSuppliers")
      .doc(docId)
      .set(
        {
          productId,
          selectedSupplierId: offer.supplierId,
          selectedSupplierName: offer.supplierName,
          supplierId: offer.supplierId,
          supplierName: offer.supplierName,
          unitCost: offer.unitCost ?? 0,
          shippingCost: offer.shippingCost ?? 0,
          source: "auto",
          confidence: score,
          candidates: [offer],
          needsAttention: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

    return NextResponse.json({ success: true, confidence: score });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to auto-link supplier", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

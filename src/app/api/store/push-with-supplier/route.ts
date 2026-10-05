import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/api-errors";
import { pushProductToStore } from "@/lib/store-push";

function sanitizeProductId(id: string): string {
  return id.replace(/\//g, "__SLASH__");
}

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { storeId, productId } = body as { storeId?: string; productId?: string };
    if (!storeId || !productId) {
      return NextResponse.json({ error: "storeId and productId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const supplierDoc = await db
      .collection("users")
      .doc(uid)
      .collection("productSuppliers")
      .doc(sanitizeProductId(productId))
      .get();
    const assignment = supplierDoc.exists ? supplierDoc.data() : null;
    const supplierId = assignment?.selectedSupplierId || assignment?.supplierId;
    if (!supplierId) {
      return NextResponse.json(
        { error: "Select a supplier for this product before pushing to store" },
        { status: 400 }
      );
    }

    // Product snapshot: prefer a saved product doc, fall back to query params.
    const { title, image, price, url, description } = body as {
      title?: string;
      image?: string;
      price?: number;
      url?: string;
      description?: string;
    };
    const priceNum = typeof price === "number" ? price : 0;
    if (!title || !(priceNum > 0)) {
      return NextResponse.json(
        { error: "title and a positive price are required to push a listing" },
        { status: 400 }
      );
    }

    const result = await pushProductToStore(uid, storeId, {
      productTitle: title,
      productImage: image || "",
      productPrice: priceNum,
      productUrl: url || "",
      productDescription: description || title,
      supplierName: assignment?.selectedSupplierName || assignment?.supplierName,
      unitCost: assignment?.unitCost,
    });

    if (result.success) {
      await db.collection("users").doc(uid).collection("pushedProducts").add({
        storeId,
        productId,
        supplierId,
        supplierName: assignment?.selectedSupplierName || assignment?.supplierName || null,
        unitCost: assignment?.unitCost ?? null,
        platformProductId: result.platformProductId ?? null,
        pushedAt: new Date().toISOString(),
      });

      // Store webhooks receive the *store's* product id (Shopify/Woo product_id,
      // Etsy product_id), not the app's product id. Alias the supplier assignment
      // under the store product id so an incoming order can be routed back to the
      // supplier the user chose when they pushed the listing.
      if (result.platformProductId != null && assignment) {
        const storeDocId = sanitizeProductId(String(result.platformProductId));
        await db
          .collection("users")
          .doc(uid)
          .collection("productSuppliers")
          .doc(storeDocId)
          .set(
            {
              ...assignment,
              productId,
              storeProductId: String(result.platformProductId),
              storeId,
              aliasedFrom: sanitizeProductId(productId),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
      }
    }

    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (error) {
    return NextResponse.json(
      { error: "Push with supplier failed", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.STORE_PUSH);

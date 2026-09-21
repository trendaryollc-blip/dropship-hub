import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody, StorePushInputSchema } from "@/lib/validation";
import { safeErrorMessage } from "@/lib/api-errors";
import { pushProductToStore } from "@/lib/store-push";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const parseResult = validateBody(StorePushInputSchema, body);
    if (!parseResult.success) return parseResult.response;
    const { storeId, ...product } = parseResult.data;

    const result = await pushProductToStore(uid, storeId, {
      productTitle: product.productTitle,
      productImage: product.productImage,
      productPrice: product.productPrice,
      productUrl: product.productUrl,
      productDescription: product.productDescription,
      productVariants: product.productVariants,
      productImages: product.productImages,
    });

    // Preserve the original 404 contract for a missing store; other push
    // failures surface as success:false with an error message.
    if (!result.success && result.error === "Store not found") {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: result.success,
      platformProductId: result.platformProductId,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json({ error: "Push failed", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.STORE_PUSH);

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("pushedProducts").orderBy("pushedAt", "desc").limit(50).get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch pushed products", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.STORE_PUSH);

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const productId = req.nextUrl.searchParams.get("productId");
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("pushedProducts").doc(productId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete pushed product", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.STORE_PUSH);

import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { signTrendaryoToken } from "@/lib/jwt";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody, StorePushInputSchema } from "@/lib/validation";

interface PushProductPayload {
  uid: string;
  storeId: string;
  productTitle: string;
  productImage: string;
  productPrice: number;
  productUrl: string;
  productDescription: string;
  productVariants?: { name: string; price: number; sku: string }[];
  productImages?: string[];
}

async function pushToShopify(domain: string, accessToken: string, product: PushProductPayload) {
  const resp = await fetch(`https://${domain}/admin/api/2024-01/products.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({
      product: {
        title: product.productTitle,
        body_html: `<p>${product.productDescription.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`,
        vendor: "DropShip Hub",
        images: product.productImage ? [{ src: product.productImage }] : [],
        variants: product.productVariants?.length
          ? product.productVariants.map((v) => ({
              title: v.name,
              price: v.price.toFixed(2),
              sku: v.sku,
            }))
          : [{ title: "Default", price: product.productPrice.toFixed(2), sku: `DSH-${Date.now()}` }],
      },
    }),
  });
  const data = await resp.json();
  return { success: resp.ok, platformProductId: data.product?.id, error: data.errors };
}

async function pushToWooCommerce(url: string, key: string, secret: string, product: PushProductPayload) {
  const credentials = Buffer.from(`${key}:${secret}`).toString("base64");
  const resp = await fetch(`${url}/wp-json/wc/v3/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      name: product.productTitle,
      description: product.productDescription,
      regular_price: product.productPrice.toFixed(2),
      images: product.productImage ? [{ src: product.productImage }] : [],
      categories: [{ name: "DropShip Hub" }],
    }),
  });
  const data = await resp.json();
  return { success: resp.ok, platformProductId: data.id, error: data.message };
}

async function pushToCustomStore(storeUrl: string, apiKey: string, product: PushProductPayload) {
  const resp = await fetch(`${storeUrl}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}`, "X-API-Key": apiKey } : {}),
    },
    body: JSON.stringify({
      title: product.productTitle,
      description: product.productDescription,
      price: product.productPrice,
      images: product.productImage ? [product.productImage] : [],
      source_url: product.productUrl,
      variants: product.productVariants,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await resp.json();
  return { success: resp.ok, platformProductId: data.id || data.product_id, error: data.error || data.message };
}

async function pushToTrendaryo(backendUrl: string, apiKey: string, product: PushProductPayload) {
  const adminUid = process.env.TRENDARYO_ADMIN_UID || "";

  let authToken = "";
  if (adminUid) {
    try {
      authToken = signTrendaryoToken({ userId: adminUid, role: "admin", type: "access" });
    } catch { /* JWT secret not configured */ }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  } else if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  let imageUrl = product.productImage || "";
  let images: string[] = [];

  if (imageUrl) {
    try {
      const uploadRes = await fetch(`${backendUrl}/api/upload/from-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          url: imageUrl,
          folder: "trendaryo/products",
          resourceType: "image",
        }),
        signal: AbortSignal.timeout(20000),
      });
      const uploadData = await uploadRes.json();
      if (uploadData.success && uploadData.data?.url) {
        imageUrl = uploadData.data.url;
        images = [uploadData.data.url];
      }
    } catch {
      // Image upload is optional — continue with original URL
    }
  }

  const resp = await fetch(`${backendUrl}/api/products`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: product.productTitle,
      description: product.productDescription,
      price: product.productPrice,
      originalPrice: product.productPrice,
      image: imageUrl,
      images: images.length > 0 ? images : imageUrl ? [imageUrl] : [],
      category: "DropShip Hub",
      stock: 100,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.success) {
    const errorMsg = typeof data.error === "string" ? data.error : data.error?.message || data.message || `HTTP ${resp.status}`;
    return { success: false, platformProductId: undefined, error: errorMsg };
  }
  return { success: true, platformProductId: data.data?.id, error: undefined };
}

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const parseResult = validateBody(StorePushInputSchema, body);
    if (!parseResult.success) return parseResult.response;
    const { storeId, ...product } = parseResult.data;

    const db = await getAdminDB();
    const storeSnap = await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).get();
    if (!storeSnap.exists) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const store = storeSnap.data() ?? {};
    let result: { success: boolean; platformProductId?: number | string; error?: unknown };

    switch (store.platform) {
      case "shopify":
        result = await pushToShopify(store.storeDomain || store.url, store.accessToken, body);
        break;
      case "woocommerce":
        result = await pushToWooCommerce(store.url, store.apiKey, store.apiSecret, body);
        break;
      case "custom":
        result = await pushToCustomStore(store.url, store.apiKey, body);
        break;
      case "trendaryo":
        result = await pushToTrendaryo(store.backendUrl, store.apiKey, body);
        break;
      default:
        return NextResponse.json({ error: `Platform "${store.platform}" push not supported yet` }, { status: 400 });
    }

    if (result.success) {
      await db.collection("users").doc(uid).collection("pushedProducts").add({
        storeId,
        storeName: store.name,
        productTitle: product.productTitle,
        productImage: product.productImage,
        productPrice: product.productPrice,
        productUrl: product.productUrl,
        productDescription: product.productDescription,
        status: "pushed",
        platformProductId: result.platformProductId,
        pushedAt: new Date().toISOString(),
      });

      // Update last sync time on the store
      await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).update({
        lastSyncAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: result.success,
      platformProductId: result.platformProductId,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json({ error: "Push failed", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.STORE_PUSH);

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("pushedProducts").orderBy("pushedAt", "desc").limit(50).get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch pushed products", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
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
    return NextResponse.json({ error: "Failed to delete pushed product", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.STORE_PUSH);

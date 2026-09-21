import { getAdminDB } from "@/lib/firebase-admin";
import { signTrendaryoToken } from "@/lib/jwt";

// ─── Real storefront push, shared by /api/store/push and /api/multi-store/bulk-push ───

export interface PushProductPayload {
  productTitle: string;
  productImage: string;
  productPrice: number;
  productUrl: string;
  productDescription: string;
  productVariants?: { name: string; price: number; sku: string }[];
  productImages?: string[];
}

export interface StorePushResult {
  success: boolean;
  platformProductId?: string | number;
  error?: string;
  storeId: string;
  storeName: string;
  platform: string;
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

// ─── Orchestrator: push a product to a connected store ──────────────────────

export async function pushProductToStore(
  uid: string,
  storeId: string,
  product: PushProductPayload
): Promise<StorePushResult> {
  const db = await getAdminDB();
  const storeSnap = await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).get();
  if (!storeSnap.exists) {
    return { success: false, error: "Store not found", storeId, storeName: "", platform: "" };
  }

  const store = storeSnap.data() ?? {};
  const storeName = (store.name as string) || storeId;
  const platform = (store.platform as string) || "";

  let result: { success: boolean; platformProductId?: number | string; error?: unknown };
  switch (platform) {
    case "shopify":
      result = await pushToShopify((store.storeDomain as string) || (store.url as string), store.accessToken as string, product);
      break;
    case "woocommerce":
      result = await pushToWooCommerce(store.url as string, store.apiKey as string, store.apiSecret as string, product);
      break;
    case "custom":
      result = await pushToCustomStore(store.url as string, store.apiKey as string, product);
      break;
    case "trendaryo":
      result = await pushToTrendaryo(store.backendUrl as string, store.apiKey as string, product);
      break;
    default:
      return { success: false, error: `Platform "${platform}" push not supported`, storeId, storeName, platform };
  }

  if (result.success) {
    await db.collection("users").doc(uid).collection("pushedProducts").add({
      storeId,
      storeName,
      productTitle: product.productTitle,
      productImage: product.productImage,
      productPrice: product.productPrice,
      productUrl: product.productUrl,
      productDescription: product.productDescription,
      status: "pushed",
      platformProductId: result.platformProductId,
      pushedAt: new Date().toISOString(),
    });
    await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).update({
      lastSyncAt: new Date().toISOString(),
    });
  }

  return {
    success: result.success,
    platformProductId: result.platformProductId,
    error: result.error ? String(result.error) : undefined,
    storeId,
    storeName,
    platform,
  };
}

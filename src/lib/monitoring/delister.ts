import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import type { MonitoredProduct, StoreConnectionRef } from "./types";

async function updateShopifyProduct(
  conn: StoreConnectionRef,
  shopifyProductId: string,
  status: "active" | "draft"
): Promise<boolean> {
  try {
    const credentials = Buffer.from(`${conn.apiKey}:${conn.apiSecret}`).toString("base64");
    const res = await fetch(`${conn.storeUrl}/admin/api/2024-01/products/${shopifyProductId}.json`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({ product: { status } }),
    });
    return res.ok;
  } catch (err) {
    logger.error("Shopify delist failed", { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

async function updateWooCommerceProduct(
  conn: StoreConnectionRef,
  wooProductId: string,
  status: "publish" | "draft"
): Promise<boolean> {
  try {
    const credentials = Buffer.from(`${conn.apiKey}:${conn.apiSecret}`).toString("base64");
    const res = await fetch(`${conn.storeUrl}/wp-json/wc/v3/products/${wooProductId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch (err) {
    logger.error("WooCommerce delist failed", { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export async function autoDelistProduct(
  uid: string,
  monitoredId: string,
  product: MonitoredProduct
): Promise<boolean> {
  if (!product.storeConnections || product.storeConnections.length === 0) {
    logger.info("No store connections for delisting", { uid, monitoredId });
    return false;
  }

  let delisted = false;

  for (const conn of product.storeConnections) {
    try {
      if (conn.platform === "shopify") {
        const success = await updateShopifyProduct(conn, product.productId, "draft");
        if (success) {
          delisted = true;
          logger.info("Shopify product delisted", { uid, monitoredId, productId: product.productId });
          break;
        }
      } else if (conn.platform === "woocommerce") {
        const success = await updateWooCommerceProduct(conn, product.productId, "draft");
        if (success) {
          delisted = true;
          logger.info("WooCommerce product delisted", { uid, monitoredId, productId: product.productId });
          break;
        }
      }
    } catch (err) {
      logger.error("Store delist failed", {
        uid,
        monitoredId,
        platform: conn.platform,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (delisted) {
    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("monitoredProducts").doc(monitoredId);
    await docRef.update({
      autoDelisted: true,
      autoDelistedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  return delisted;
}

export async function reListProduct(
  uid: string,
  monitoredId: string,
  product: MonitoredProduct
): Promise<boolean> {
  if (!product.storeConnections || product.storeConnections.length === 0) return false;

  let relisted = false;

  for (const conn of product.storeConnections) {
    try {
      if (conn.platform === "shopify") {
        const success = await updateShopifyProduct(conn, product.productId, "active");
        if (success) {
          relisted = true;
          break;
        }
      } else if (conn.platform === "woocommerce") {
        const success = await updateWooCommerceProduct(conn, product.productId, "publish");
        if (success) {
          relisted = true;
          break;
        }
      }
    } catch (err) {
      logger.error("Store relist failed", {
        uid,
        monitoredId,
        platform: conn.platform,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (relisted) {
    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("monitoredProducts").doc(monitoredId);
    await docRef.update({
      autoDelisted: false,
      autoDelistedAt: null,
    }).catch(() => {});
  }

  return relisted;
}

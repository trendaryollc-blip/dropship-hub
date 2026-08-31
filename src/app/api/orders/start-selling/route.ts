import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";

interface StartSellingRequest {
  productTitle: string;
  productImage: string;
  productPrice: number;
  productUrl: string;
  productDescription: string;
  productVariants?: { name: string; price: number; sku: string }[];
  storeId: string;
  autoOrder?: boolean;
  shippingAddress?: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const {
      productTitle,
      productImage,
      productPrice,
      productUrl,
      productDescription,
      productVariants,
      storeId,
      autoOrder,
      shippingAddress,
    } = body as StartSellingRequest;

    if (!productTitle || !storeId) {
      return NextResponse.json({ error: "productTitle and storeId are required" }, { status: 400 });
    }

    const db = await getAdminDB();

    // 1. Get store connection
    const storeSnap = await db
      .collection("users")
      .doc(uid)
      .collection("storeConnections")
      .doc(storeId)
      .get();

    if (!storeSnap.exists) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const store = storeSnap.data() ?? {};

    // 2. Push product to store (reuse existing push logic)
    let pushResult: { success: boolean; platformProductId?: number | string; error?: unknown };

    const pushBody = {
      productTitle,
      productImage,
      productPrice,
      productUrl,
      productDescription,
      productVariants,
    };

    switch (store.platform) {
      case "shopify": {
        const resp = await fetch(`https://${store.storeDomain || store.url}/admin/api/2024-01/products.json`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": store.accessToken,
          },
          body: JSON.stringify({
            product: {
              title: productTitle,
              body_html: `<p>${productDescription}</p>`,
              vendor: "DropShip Hub",
              images: productImage ? [{ src: productImage }] : [],
              variants: productVariants?.length
                ? productVariants.map((v) => ({ title: v.name, price: v.price.toFixed(2), sku: v.sku }))
                : [{ title: "Default", price: productPrice.toFixed(2), sku: `DSH-${Date.now()}` }],
            },
          }),
        });
        const data = await resp.json();
        pushResult = { success: resp.ok, platformProductId: data.product?.id, error: data.errors };
        break;
      }
      case "woocommerce": {
        const credentials = Buffer.from(`${store.apiKey}:${store.apiSecret}`).toString("base64");
        const resp = await fetch(`${store.url}/wp-json/wc/v3/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${credentials}`,
          },
          body: JSON.stringify({
            name: productTitle,
            description: productDescription,
            regular_price: productPrice.toFixed(2),
            images: productImage ? [{ src: productImage }] : [],
            categories: [{ name: "DropShip Hub" }],
          }),
        });
        const data = await resp.json();
        pushResult = { success: resp.ok, platformProductId: data.id, error: data.message };
        break;
      }
      default:
        pushResult = { success: false, error: `Platform "${store.platform}" not supported for auto-push` };
    }

    if (!pushResult.success) {
      return NextResponse.json({ error: "Failed to push product to store", details: pushResult.error }, { status: 400 });
    }

    // 3. Record the pushed product
    const pushedProductDoc = {
      uid,
      storeId,
      storeName: store.name,
      productTitle,
      productImage,
      productPrice,
      productUrl,
      productDescription,
      status: "pushed",
      platformProductId: pushResult.platformProductId,
      pushedAt: new Date().toISOString(),
    };

    const pushedRef = await db.collection("users").doc(uid).collection("pushedProducts").add(pushedProductDoc);

    // 4. Update last sync time
    await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).update({
      lastSyncAt: new Date().toISOString(),
    });

    // 5. If autoOrder is requested, create a fulfillment order
    let fulfillmentOrder = null;
    if (autoOrder && shippingAddress) {
      const fulfillmentDoc = {
        uid,
        productTitle,
        productImage,
        productPrice,
        productUrl,
        source: store.platform,
        storeId,
        storeName: store.name,
        quantity: 1,
        shippingAddress,
        status: "pending",
        platformProductId: pushResult.platformProductId,
        pushedProductId: pushedRef.id,
        createdAt: new Date().toISOString(),
      };

      const fulfillRef = await db.collection("users").doc(uid).collection("fulfillmentOrders").add(fulfillmentDoc);
      fulfillmentOrder = { id: fulfillRef.id, ...fulfillmentDoc };
    }

    return NextResponse.json({
      success: true,
      pushedProduct: { id: pushedRef.id, ...pushedProductDoc },
      fulfillmentOrder,
      message: fulfillmentOrder
        ? "Product pushed to store and fulfillment order created"
        : "Product pushed to store successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Start selling failed" },
      { status: 500 }
    );
  }
});

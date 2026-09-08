import { z } from "zod";
import { createTool } from "./registry";
import { getStoreAdapter } from "@/lib/fulfillment/store-adapters";
import { syncInventoryForStore } from "@/lib/fulfillment/inventory-sync";
import { getAdminDB } from "@/lib/firebase-admin";

// ─── Push to Store ───────────────────────────────────────────────────────────

export const pushToStoreTool = createTool({
  id: "push_to_store",
  name: "Push to Store",
  description: "Push a product to a connected store (Shopify, WooCommerce, Etsy)",
  category: "store",
  safetyLevel: "dangerous",
  inputSchema: z.object({
    productId: z.string().min(1),
    storeId: z.string().min(1),
    platform: z.enum(["shopify", "woocommerce", "etsy", "trendaryo"]),
    title: z.string().min(1),
    description: z.string().optional(),
    price: z.number().min(0),
    compareAtPrice: z.number().min(0).optional(),
    images: z.array(z.string().url()).optional(),
    variants: z.array(z.object({
      title: z.string(),
      price: z.number().min(0),
      sku: z.string().optional(),
      inventory: z.number().int().min(0).optional(),
    })).optional(),
  }),
  execute: async (input, ctx) => {
    const db = await getAdminDB();
    const connDoc = await db.collection("users").doc(ctx.uid).collection("storeConnections").doc(input.storeId as string).get();

    if (!connDoc.exists) {
      return { success: false, data: null, summary: "Store connection not found.", error: "Store not connected" };
    }

    const adapter = getStoreAdapter(input.platform as string);
    if (!adapter) {
      return { success: false, data: null, summary: `Platform ${input.platform} not supported.`, error: "Unsupported platform" };
    }

    const productRef = db.collection("users").doc(ctx.uid).collection("pushedProducts").doc();
    const productData = {
      id: productRef.id,
      productId: input.productId,
      storeId: input.storeId,
      platform: input.platform,
      title: input.title,
      description: input.description || "",
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      images: input.images || [],
      variants: input.variants || [],
      status: "pushed",
      pushedAt: new Date().toISOString(),
    };

    await productRef.set(productData);

    return {
      success: true,
      data: productData,
      summary: `Product "${input.title}" pushed to ${input.platform} store. Price: $${input.price}.`,
      actions: [{ label: "View in Store", href: `/${input.platform}/products` }],
    };
  },
});

// ─── Push Bulk to Store ──────────────────────────────────────────────────────

export const pushBulkToStoreTool = createTool({
  id: "push_bulk_to_store",
  name: "Push Bulk to Store",
  description: "Push multiple products to a connected store in batch",
  category: "store",
  safetyLevel: "dangerous",
  inputSchema: z.object({
    storeId: z.string().min(1),
    platform: z.enum(["shopify", "woocommerce", "etsy", "trendaryo"]),
    products: z.array(z.object({
      productId: z.string(),
      title: z.string(),
      price: z.number().min(0),
      description: z.string().optional(),
      images: z.array(z.string().url()).optional(),
    })).min(1).max(25),
  }),
  execute: async (input, ctx) => {
    const db = await getAdminDB();
    const products = input.products as Array<{
      productId: string;
      title: string;
      price: number;
      description?: string;
      images?: string[];
    }>;
    const results = [];

    for (const product of products) {
      const productRef = db.collection("users").doc(ctx.uid).collection("pushedProducts").doc();
      const productData = {
        id: productRef.id,
        productId: product.productId,
        storeId: input.storeId,
        platform: input.platform,
        title: product.title,
        description: product.description || "",
        price: product.price,
        images: product.images || [],
        status: "pushed",
        pushedAt: new Date().toISOString(),
      };

      await productRef.set(productData);
      results.push({ productId: product.productId, success: true });
    }

    return {
      success: true,
      data: results,
      summary: `Pushed ${results.length}/${products.length} products to ${input.platform}.`,
    };
  },
});

// ─── Sync Inventory ──────────────────────────────────────────────────────────

export const syncInventoryTool = createTool({
  id: "sync_inventory",
  name: "Sync Inventory",
  description: "Sync inventory levels from supplier (CJ) to your store",
  category: "store",
  safetyLevel: "moderate",
  inputSchema: z.object({
    storeId: z.string().min(1),
    storePlatform: z.enum(["shopify", "woocommerce", "etsy"]),
    productMappings: z.array(z.object({
      supplierProductId: z.string(),
      storeProductId: z.string(),
    })).min(1).max(50),
  }),
  execute: async (input) => {
    const result = await syncInventoryForStore(
      input.storeId as string,
      input.storePlatform as string,
      input.productMappings as Parameters<typeof syncInventoryForStore>[2]
    );

    return {
      success: result.success,
      data: result,
      summary: `Inventory sync: ${result.synced} synced, ${result.failed} failed. ${result.errors?.length || 0} errors.`,
    };
  },
});

// ─── Get Store Products ──────────────────────────────────────────────────────

export const getStoreProductsTool = createTool({
  id: "get_store_products",
  name: "Get Store Products",
  description: "Get products listed on a connected store",
  category: "store",
  safetyLevel: "safe",
  inputSchema: z.object({
    storeId: z.string().min(1),
    limit: z.number().int().min(1).max(100).default(20),
  }),
  execute: async (input, ctx) => {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(ctx.uid).collection("pushedProducts")
      .where("storeId", "==", input.storeId)
      .limit(input.limit as number)
      .get();

    const products = snap.docs.map((doc) => doc.data());
    return {
      success: true,
      data: products,
      summary: `Found ${products.length} products on store ${input.storeId}.`,
    };
  },
});

// ─── Update Store Product ────────────────────────────────────────────────────

export const updateStoreProductTool = createTool({
  id: "update_store_product",
  name: "Update Store Product",
  description: "Update product details (price, title, description) on a connected store",
  category: "store",
  safetyLevel: "moderate",
  inputSchema: z.object({
    storeProductId: z.string().min(1),
    storeId: z.string().min(1),
    platform: z.enum(["shopify", "woocommerce", "etsy"]),
    updates: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      price: z.number().min(0).optional(),
      compareAtPrice: z.number().min(0).optional(),
    }),
  }),
  execute: async (input, ctx) => {
    const db = await getAdminDB();
    const docRef = db.collection("users").doc(ctx.uid).collection("pushedProducts").doc(input.storeProductId as string);
    const doc = await docRef.get();

    if (!doc.exists) {
      return { success: false, data: null, summary: "Product not found.", error: "Product not found" };
    }

    const updates = input.updates as { title?: string; description?: string; price?: number; compareAtPrice?: number };
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.compareAtPrice !== undefined) updateData.compareAtPrice = updates.compareAtPrice;

    await docRef.update(updateData);

    const updatedFields = Object.keys(updates).filter((k) => updates[k as keyof typeof updates] !== undefined);
    return {
      success: true,
      data: { id: input.storeProductId, ...updateData },
      summary: `Updated product ${input.storeProductId}: ${updatedFields.join(", ")}.`,
    };
  },
});

// ─── Remove Store Product ────────────────────────────────────────────────────

export const removeStoreProductTool = createTool({
  id: "remove_store_product",
  name: "Remove Store Product",
  description: "Remove a product from a connected store",
  category: "store",
  safetyLevel: "dangerous",
  inputSchema: z.object({
    storeProductId: z.string().min(1),
    storeId: z.string().min(1),
    platform: z.enum(["shopify", "woocommerce", "etsy"]),
  }),
  execute: async (input, ctx) => {
    const db = await getAdminDB();
    const docRef = db.collection("users").doc(ctx.uid).collection("pushedProducts").doc(input.storeProductId as string);
    const doc = await docRef.get();

    if (!doc.exists) {
      return { success: false, data: null, summary: "Product not found.", error: "Product not found" };
    }

    await docRef.update({ status: "removed", removedAt: new Date().toISOString() });

    return {
      success: true,
      data: { id: input.storeProductId },
      summary: `Product ${input.storeProductId} removed from ${input.platform}.`,
    };
  },
});

// ─── Get Store Performance ───────────────────────────────────────────────────

export const getStorePerformanceTool = createTool({
  id: "get_store_performance",
  name: "Get Store Performance",
  description: "Get performance metrics for a connected store (orders, revenue, conversion)",
  category: "store",
  safetyLevel: "safe",
  inputSchema: z.object({
    storeId: z.string().min(1),
    period: z.enum(["7d", "30d", "90d"]).default("30d"),
  }),
  execute: async (input, ctx) => {
    const db = await getAdminDB();
    const days = input.period === "7d" ? 7 : input.period === "30d" ? 30 : 90;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const ordersSnap = await db.collection("users").doc(ctx.uid).collection("fulfillmentOrders")
      .where("storeId", "==", input.storeId)
      .where("createdAt", ">=", since)
      .get();

    const orders = ordersSnap.docs.map((doc) => doc.data());
    const totalRevenue = orders.reduce((sum: number, o: { totalRevenue?: number }) => sum + (o.totalRevenue || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      success: true,
      data: {
        storeId: input.storeId,
        period: input.period,
        totalOrders,
        totalRevenue,
        avgOrderValue,
      },
      summary: `${input.period} performance: ${totalOrders} orders, $${totalRevenue.toFixed(2)} revenue, $${avgOrderValue.toFixed(2)} AOV.`,
    };
  },
});

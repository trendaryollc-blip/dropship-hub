import { z } from "zod";
import { createTool } from "./registry";
import { routeOrder, createRoutingInput } from "@/lib/fulfillment/supplier-router";
import { placeCJOrder } from "@/lib/fulfillment/cj-adapter";
import { getShipmentStatus, syncTrackingToStore } from "@/lib/fulfillment/shipment-tracker";
import { batchCheckInventory } from "@/lib/fulfillment/inventory-checker";
import { getAdminDB } from "@/lib/firebase-admin";

// ─── Route Order ─────────────────────────────────────────────────────────────

export const routeOrderTool = createTool({
  id: "route_order",
  name: "Route Order",
  description: "Find the best supplier for an order based on cost, speed, reliability, and stock availability",
  category: "fulfillment",
  safetyLevel: "safe",
  inputSchema: z.object({
    orderId: z.string().min(1),
    items: z.array(z.object({
      productId: z.string(),
      name: z.string(),
      quantity: z.number().int().min(1),
      unitCost: z.number().min(0),
    })).min(1),
    customerCountry: z.string().min(1),
    optimization: z.enum(["speed", "cost", "balanced"]).default("balanced"),
    totalRevenue: z.number().min(0).optional(),
  }),
  execute: async (input, ctx) => {
    const order = {
      id: input.orderId as string,
      items: input.items as Array<{ productId: string; name: string; quantity: number; unitCost: number }>,
      shippingAddress: { country: input.customerCountry as string },
      totalRevenue: (input.totalRevenue as number) || 0,
    };

    const db = await getAdminDB();
    const prefsSnap = await db.collection("users").doc(ctx.uid).collection("settings").doc("routing").get();
    const prefs = prefsSnap.exists ? prefsSnap.data() : {};

    const routingInput = createRoutingInput(
      order as Parameters<typeof createRoutingInput>[0],
      (prefs?.supplierInventory as Parameters<typeof createRoutingInput>[1]) || [],
      input.optimization as "speed" | "cost" | "balanced",
      { maxShippingDays: prefs?.maxShippingDays as number, minReliability: prefs?.minReliabilityScore as number }
    );

    const result = routeOrder(routingInput);

    return {
      success: true,
      data: result,
      summary: `Best supplier: ${result.selectedSupplier.supplierName} (score: ${result.selectedSupplier.totalScore.toFixed(1)}). Reason: ${result.reason}. ${result.alternatives.length} alternatives available.`,
    };
  },
});

// ─── Bulk Route Orders ───────────────────────────────────────────────────────

export const bulkRouteOrdersTool = createTool({
  id: "bulk_route_orders",
  name: "Bulk Route Orders",
  description: "Route multiple orders to optimal suppliers in batch",
  category: "fulfillment",
  safetyLevel: "moderate",
  inputSchema: z.object({
    orders: z.array(z.object({
      orderId: z.string(),
      items: z.array(z.object({
        productId: z.string(),
        name: z.string(),
        quantity: z.number().int().min(1),
        unitCost: z.number().min(0),
      })),
      customerCountry: z.string(),
      totalRevenue: z.number().min(0).optional(),
    })).min(1).max(50),
    optimization: z.enum(["speed", "cost", "balanced"]).default("balanced"),
  }),
  execute: async (input, ctx) => {
    const orders = input.orders as Array<{
      orderId: string;
      items: Array<{ productId: string; name: string; quantity: number; unitCost: number }>;
      customerCountry: string;
      totalRevenue?: number;
    }>;
    const optimization = input.optimization as "speed" | "cost" | "balanced";

    const results = [];
    for (const order of orders) {
      const routingInput = createRoutingInput(
        {
          id: order.orderId,
          items: order.items,
          shippingAddress: { country: order.customerCountry },
          totalRevenue: order.totalRevenue || 0,
        } as Parameters<typeof createRoutingInput>[0],
        [],
        optimization
      );
      const result = routeOrder(routingInput);
      results.push({ orderId: order.orderId, routing: result });
    }

    const routed = results.filter((r) => r.routing.selectedSupplier).length;
    return {
      success: true,
      data: results,
      summary: `Routed ${routed}/${results.length} orders. ${results.length - routed} failed to find suitable suppliers.`,
    };
  },
});

// ─── Place Order ─────────────────────────────────────────────────────────────

export const placeOrderTool = createTool({
  id: "place_order",
  name: "Place Order",
  description: "Place an order with a supplier (CJ Dropshipping) for fulfillment",
  category: "fulfillment",
  safetyLevel: "dangerous",
  inputSchema: z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1),
    shippingAddress: z.object({
      name: z.string().min(1),
      address: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      zip: z.string().min(1),
      country: z.string().min(1),
      phone: z.string().optional(),
    }),
  }),
  execute: async (input) => {
    const result = await placeCJOrder({
      productId: input.productId as string,
      quantity: input.quantity as number,
      shippingAddress: input.shippingAddress as Parameters<typeof placeCJOrder>[0]["shippingAddress"],
    });

    return {
      success: result.success,
      data: result,
      summary: result.success
        ? `Order placed successfully. CJ Order ID: ${result.orderId}. Estimated delivery: ${result.estimatedDelivery || "TBD"}.`
        : `Order failed: ${result.error}`,
      actions: result.success ? [{ label: "Track Order", href: `/fulfillment?order=${result.orderId}` }] : undefined,
    };
  },
});

// ─── Bulk Place Orders ───────────────────────────────────────────────────────

export const bulkPlaceOrdersTool = createTool({
  id: "bulk_place_orders",
  name: "Bulk Place Orders",
  description: "Place multiple orders with CJ Dropshipping in batch",
  category: "fulfillment",
  safetyLevel: "dangerous",
  inputSchema: z.object({
    orders: z.array(z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
      shippingAddress: z.object({
        name: z.string(),
        address: z.string(),
        city: z.string(),
        state: z.string(),
        zip: z.string(),
        country: z.string(),
        phone: z.string().optional(),
      }),
    })).min(1).max(50),
  }),
  execute: async (input) => {
    const orders = input.orders as Array<{
      productId: string;
      quantity: number;
      shippingAddress: {
        fullName: string;
        phone: string;
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
      };
    }>;

    const results = [];
    for (const order of orders) {
      const result = await placeCJOrder({
        productId: order.productId,
        quantity: order.quantity,
        shippingAddress: order.shippingAddress,
      });
      results.push({ ...result, productId: order.productId });
    }

    const succeeded = results.filter((r) => r.success).length;
    return {
      success: succeeded > 0,
      data: results,
      summary: `Bulk order: ${succeeded}/${results.length} placed successfully. ${results.length - succeeded} failed.`,
    };
  },
});

// ─── Get Tracking ────────────────────────────────────────────────────────────

export const getTrackingTool = createTool({
  id: "get_tracking",
  name: "Get Tracking",
  description: "Get shipment tracking status and history for an order",
  category: "shipping",
  safetyLevel: "safe",
  inputSchema: z.object({
    cjOrderNumber: z.string().min(1),
  }),
  execute: async (input) => {
    const status = await getShipmentStatus(input.cjOrderNumber as string);
    const eventCount = status.events?.length || 0;
    return {
      success: true,
      data: status,
      summary: `Order ${input.cjOrderNumber}: ${status.status}. Carrier: ${status.carrier || "TBD"}. Tracking: ${status.trackingNumber || "Not yet assigned"}. ${eventCount} tracking events.`,
    };
  },
});

// ─── Sync Tracking ───────────────────────────────────────────────────────────

export const syncTrackingTool = createTool({
  id: "sync_tracking",
  name: "Sync Tracking",
  description: "Sync tracking information from supplier to your store (Shopify/WooCommerce)",
  category: "fulfillment",
  safetyLevel: "moderate",
  inputSchema: z.object({
    storeId: z.string().min(1),
    storePlatform: z.enum(["shopify", "woocommerce", "etsy"]),
    platformOrderId: z.string().min(1),
    trackingNumber: z.string().min(1),
    carrier: z.string().min(1),
    estimatedDelivery: z.string().optional(),
  }),
  execute: async (input) => {
    const result = await syncTrackingToStore(
      input.storeId as string,
      input.storePlatform as string,
      input.platformOrderId as string,
      input.trackingNumber as string,
      input.carrier as string,
      (input.estimatedDelivery as string) || null
    );

    return {
      success: true,
      data: result,
      summary: `Tracking synced to ${input.storePlatform} for order ${input.platformOrderId}.`,
    };
  },
});

// ─── Get Fulfillment Status ──────────────────────────────────────────────────

export const getFulfillmentStatusTool = createTool({
  id: "get_fulfillment_status",
  name: "Get Fulfillment Status",
  description: "Get the current fulfillment status and details for an order",
  category: "fulfillment",
  safetyLevel: "safe",
  inputSchema: z.object({
    orderId: z.string().min(1),
  }),
  execute: async (input, ctx) => {
    const db = await getAdminDB();
    const doc = await db.collection("users").doc(ctx.uid).collection("fulfillmentOrders").doc(input.orderId as string).get();

    if (!doc.exists) {
      return { success: true, data: null, summary: `Order ${input.orderId} not found.` };
    }

    const order = doc.data();
    const platformOrders = order?.platformOrders || [];
    const tracking = platformOrders.map((po: { platform: string; trackingNumber: string; status: string }) =>
      `${po.platform}: ${po.status} (${po.trackingNumber || "no tracking"})`
    ).join(", ");

    return {
      success: true,
      data: order,
      summary: `Order ${input.orderId}: Status ${order?.status || "unknown"}. ${tracking || "No platform orders yet."}`,
    };
  },
});

// ─── Optimize Fulfillment ────────────────────────────────────────────────────

export const optimizeFulfillmentTool = createTool({
  id: "optimize_fulfillment",
  name: "Optimize Fulfillment",
  description: "Automatically optimize fulfillment for all pending orders by routing to best suppliers",
  category: "fulfillment",
  safetyLevel: "moderate",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).default(20),
    optimization: z.enum(["speed", "cost", "balanced"]).default("balanced"),
  }),
  execute: async (input, ctx) => {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(ctx.uid).collection("fulfillmentOrders")
      .where("status", "==", "pending")
      .limit(input.limit as number)
      .get();

    const orders = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const optimization = input.optimization as "speed" | "cost" | "balanced";
    const results = [];

    for (const order of orders) {
      const orderData = order as { id: string; items?: unknown[]; shippingAddress?: unknown; totalRevenue?: number };
      const routingInput = createRoutingInput(
        {
          id: orderData.id,
          items: orderData.items || [],
          shippingAddress: orderData.shippingAddress || {},
          totalRevenue: orderData.totalRevenue || 0,
        } as Parameters<typeof createRoutingInput>[0],
        [],
        optimization
      );
      const result = routeOrder(routingInput);
      results.push({ orderId: orderData.id, routing: result });
    }

    const optimized = results.filter((r) => r.routing.selectedSupplier).length;
    return {
      success: true,
      data: results,
      summary: `Optimized ${optimized}/${orders.length} pending orders. ${orders.length - optimized} could not be routed.`,
    };
  },
});

// ─── Process Returns ─────────────────────────────────────────────────────────

export const processReturnsTool = createTool({
  id: "process_returns",
  name: "Process Returns",
  description: "Process return requests by generating return labels and updating status",
  category: "fulfillment",
  safetyLevel: "moderate",
  inputSchema: z.object({
    returnIds: z.array(z.string()).min(1).max(20),
    action: z.enum(["approve", "deny", "generate_label"]),
  }),
  execute: async (input, ctx) => {
    const db = await getAdminDB();
    const returnIds = input.returnIds as string[];
    const action = input.action as "approve" | "deny" | "generate_label";
    const results = [];

    for (const returnId of returnIds) {
      const docRef = db.collection("users").doc(ctx.uid).collection("returns").doc(returnId);
      const doc = await docRef.get();

      if (!doc.exists) {
        results.push({ returnId, success: false, error: "Return not found" });
        continue;
      }

      const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

      if (action === "approve") {
        updates.status = "approved";
        updates.approvedAt = new Date().toISOString();
      } else if (action === "deny") {
        updates.status = "denied";
        updates.deniedAt = new Date().toISOString();
      } else if (action === "generate_label") {
        updates.status = "label_generated";
        updates.labelGeneratedAt = new Date().toISOString();
      }

      await docRef.update(updates);
      results.push({ returnId, success: true, newStatus: updates.status });
    }

    const succeeded = results.filter((r) => r.success).length;
    return {
      success: true,
      data: results,
      summary: `Processed ${succeeded}/${results.length} returns. Action: ${action}.`,
    };
  },
});

// ─── Check Supplier Inventory ────────────────────────────────────────────────

export const getSupplierInventoryTool = createTool({
  id: "get_supplier_inventory",
  name: "Get Supplier Inventory",
  description: "Check inventory levels for products at a specific supplier",
  category: "supplier",
  safetyLevel: "safe",
  inputSchema: z.object({
    productIds: z.array(z.string()).min(1).max(20),
    supplierId: z.string().optional(),
  }),
  execute: async (input) => {
    const productIds = input.productIds as string[];
    const supplierId = (input.supplierId as string) || "cj";

    const checks = productIds.map((productId) => ({
      supplierId,
      productId,
    }));

    const results = await batchCheckInventory(checks);
    const inStock = results.filter((r) => r.inStock).length;
    return {
      success: true,
      data: results,
      summary: `Checked ${results.length} products: ${inStock} in stock, ${results.length - inStock} out of stock.`,
    };
  },
});

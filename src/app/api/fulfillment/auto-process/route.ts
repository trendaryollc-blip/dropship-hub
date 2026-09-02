import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { orchestrateOrder, createOrchestrationInput } from "@/lib/fulfillment/orchestrator";
import { createDefaultRules } from "@/lib/fulfillment/rules-engine";
import type { FulfillmentOrder } from "@/types/fulfillment";
import type { FulfillmentRule } from "@/types/automation";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { orderId, trigger = "manual" } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const orderDoc = await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = { id: orderDoc.id, ...orderDoc.data() } as FulfillmentOrder;

    const rulesSnap = await db.collection("users").doc(uid).collection("fulfillmentRules").get();
    const rules: FulfillmentRule[] = rulesSnap.empty
      ? createDefaultRules()
      : rulesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FulfillmentRule));

    const supplierInventory = orderData.items.map((item) => ({
      supplierId: item.supplierId || "cj",
      supplierName: item.supplierName || "CJ Dropshipping",
      inStock: true,
      stockLevel: 999,
      unitCost: item.unitCost || 0,
      shippingCost: 0,
      shippingDays: 10,
      reliabilityScore: 85,
      qualityScore: 80,
    }));

    if (supplierInventory.length === 0) {
      supplierInventory.push({
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        inStock: true,
        stockLevel: 999,
        unitCost: 0,
        shippingCost: 0,
        shippingDays: 10,
        reliabilityScore: 85,
        qualityScore: 80,
      });
    }

    const settingsDoc = await db.collection("users").doc(uid).collection("fulfillmentSettings").doc("config").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    const input = createOrchestrationInput(
      uid,
      orderData,
      trigger as "webhook" | "poll" | "manual" | "bulk" | "scheduled",
      rules,
      supplierInventory,
      {
        autoApprove: settings?.autoApprove,
        optimization: settings?.optimization || "balanced",
        maxShippingDays: settings?.maxShippingDays,
        minReliabilityScore: settings?.minReliabilityScore,
      }
    );

    const result = await orchestrateOrder(input);

    if (result.action === "placed_order" || result.action === "auto_fulfilled") {
      const updateData: Record<string, unknown> = {
        status: result.state.selectedSupplier ? "in_progress" : "pending",
        updatedAt: new Date().toISOString(),
      };

      if (result.state.selectedSupplier) {
        updateData.assignedSupplier = result.state.selectedSupplier;
      }
      if (result.state.cjOrderId) {
        updateData.platformOrders = [{
          platform: "cj",
          platformOrderId: result.state.cjOrderId,
          trackingNumber: null,
          carrier: null,
          status: "placed",
          placedAt: new Date().toISOString(),
          shippedAt: null,
          deliveredAt: null,
          estimatedDelivery: null,
          error: null,
        }];
      }

      await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).update(updateData);
    }

    if (result.action === "rejected") {
      await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).update({
        status: "pending",
        automationError: result.message,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      action: result.action,
      message: result.message,
      pipeline: {
        status: result.state.status,
        selectedSupplier: result.state.selectedSupplier,
        cjOrderId: result.state.cjOrderId,
        steps: result.state.steps,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Auto-processing failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const pendingSnap = await db.collection("users").doc(uid).collection("fulfillmentOrders")
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const orders = pendingSnap.docs.map((d) => ({
      id: d.id,
      orderNumber: d.data().orderNumber,
      customerName: d.data().customerName,
      totalRevenue: d.data().totalRevenue,
      storePlatform: d.data().storePlatform,
      createdAt: d.data().createdAt,
    }));

    return NextResponse.json({ orders, count: orders.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch pending orders", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import {
  createBulkOperation,
  startBulkOperation,
  processBulkResult,
  getBulkOperation,
  validateBulkInput,
  getBulkOperationHistory,
} from "@/lib/fulfillment/bulk-processor";
import { orchestrateOrder, createOrchestrationInput } from "@/lib/fulfillment/orchestrator";
import { createDefaultRules } from "@/lib/fulfillment/rules-engine";
import type { FulfillmentOrder } from "@/types/fulfillment";
import type { FulfillmentRule } from "@/types/automation";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { orderIds, action } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: "orderIds array required" }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: "action required" }, { status: 400 });
    }

    const validation = validateBulkInput({ orderIds, action });
    if (!validation.valid) {
      return NextResponse.json({ error: "Validation failed", details: validation.errors }, { status: 400 });
    }

    const db = await getAdminDB();
    const operation = createBulkOperation({ orderIds, action });
    startBulkOperation(operation.id);

    if (action === "fulfill") {
      const rulesSnap = await db.collection("users").doc(uid).collection("fulfillmentRules").get();
      const rules: FulfillmentRule[] = rulesSnap.empty
        ? createDefaultRules()
        : rulesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FulfillmentRule));

      const settingsDoc = await db.collection("users").doc(uid).collection("fulfillmentSettings").doc("config").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};

      for (const orderId of orderIds) {
        try {
          const orderDoc = await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).get();
          if (!orderDoc.exists) {
            processBulkResult(operation.id, { orderId, success: false, error: "Order not found" });
            continue;
          }

          const orderData = { id: orderDoc.id, ...orderDoc.data() } as FulfillmentOrder;
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
              supplierId: "cj", supplierName: "CJ Dropshipping",
              inStock: true, stockLevel: 999, unitCost: 0,
              shippingCost: 0, shippingDays: 10, reliabilityScore: 85, qualityScore: 80,
            });
          }

          const input = createOrchestrationInput(uid, orderData, "bulk", rules, supplierInventory, {
            autoApprove: settings?.autoApprove,
            optimization: settings?.optimization || "balanced",
            maxShippingDays: settings?.maxShippingDays,
            minReliabilityScore: settings?.minReliabilityScore,
          });

          const result = await orchestrateOrder(input);

          if (result.action === "placed_order" || result.action === "auto_fulfilled") {
            const updateData: Record<string, unknown> = {
              status: "in_progress",
              updatedAt: new Date().toISOString(),
              assignedSupplier: result.state.selectedSupplier,
            };
            if (result.state.cjOrderId) {
              updateData.platformOrders = [{
                platform: "cj",
                platformOrderId: result.state.cjOrderId,
                trackingNumber: null, carrier: null, status: "placed",
                placedAt: new Date().toISOString(), shippedAt: null,
                deliveredAt: null, estimatedDelivery: null, error: null,
              }];
            }
            await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).update(updateData);
            processBulkResult(operation.id, { orderId, success: true });
          } else {
            processBulkResult(operation.id, { orderId, success: false, error: result.message });
          }
        } catch (error) {
          processBulkResult(operation.id, {
            orderId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    } else if (action === "cancel") {
      for (const orderId of orderIds) {
        try {
          await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).update({
            status: "cancelled",
            updatedAt: new Date().toISOString(),
          });
          processBulkResult(operation.id, { orderId, success: true });
        } catch (error) {
          processBulkResult(operation.id, {
            orderId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    } else {
      for (const orderId of orderIds) {
        processBulkResult(operation.id, { orderId, success: false, error: `Action "${action}" not yet implemented` });
      }
    }

    const finalOp = getBulkOperation(operation.id);

    return NextResponse.json({
      success: true,
      operation: finalOp,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Bulk operation failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const operationId = req.nextUrl.searchParams.get("operationId");
    if (operationId) {
      const op = getBulkOperation(operationId);
      if (!op) return NextResponse.json({ error: "Operation not found" }, { status: 404 });
      return NextResponse.json({ operation: op });
    }

    const history = getBulkOperationHistory(20);
    return NextResponse.json({ operations: history });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch operations", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

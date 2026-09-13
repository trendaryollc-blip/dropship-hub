import type { BulkOperation } from "@/types/automation";
import type { FulfillmentOrder } from "@/types/fulfillment";
import { getAdminDB } from "@/lib/firebase-admin";

interface BulkOrderInput {
  orderIds: string[];
  action: "fulfill" | "cancel" | "sync_tracking" | "check_status" | "place_orders";
}

interface BulkProcessResult {
  orderId: string;
  success: boolean;
  error?: string;
}

interface BulkOrderPlacementInput {
  orders: FulfillmentOrder[];
  supplierId: string;
  autoApprove: boolean;
}

interface BulkOrderPlacementResult {
  operationId: string;
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  orders: Array<{
    orderId: string;
    cjOrderId?: string;
    success: boolean;
    error?: string;
  }>;
}

const COLLECTION = "bulkOperations";

async function getCollection() {
  const db = await getAdminDB();
  return db.collection("system").doc("fulfillment").collection(COLLECTION);
}

async function saveOperation(op: BulkOperation): Promise<void> {
  try {
    const col = await getCollection();
    await col.doc(op.id).set(op, { merge: true });
  } catch (error) {
    console.error("[bulk-processor] Failed to save operation:", error);
  }
}

export async function createBulkOperation(input: BulkOrderInput): Promise<BulkOperation> {
  const id = `bulk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const operation: BulkOperation = {
    id,
    orderIds: input.orderIds,
    action: input.action,
    status: "pending",
    totalOrders: input.orderIds.length,
    processedOrders: 0,
    successfulOrders: 0,
    failedOrders: 0,
    errors: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  await saveOperation(operation);
  return operation;
}

export async function getBulkOperation(id: string): Promise<BulkOperation | null> {
  try {
    const col = await getCollection();
    const doc = await col.doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as BulkOperation;
  } catch (error) {
    console.error("[bulk-processor] Failed to get operation:", error);
    return null;
  }
}

export async function updateBulkOperation(
  id: string,
  update: Partial<BulkOperation>
): Promise<BulkOperation | null> {
  try {
    const col = await getCollection();
    const docRef = col.doc(id);
    await docRef.update({ ...update, startedAt: update.startedAt || undefined });
    const snap = await docRef.get();
    if (!snap.exists) return null;
    return snap.data() as BulkOperation;
  } catch (error) {
    console.error("[bulk-processor] Failed to update operation:", error);
    return null;
  }
}

export async function processBulkResult(
  operationId: string,
  result: BulkProcessResult
): Promise<BulkOperation | null> {
  try {
    const op = await getBulkOperation(operationId);
    if (!op) return null;

    op.processedOrders++;
    if (result.success) {
      op.successfulOrders++;
    } else {
      op.failedOrders++;
      op.errors.push({
        orderId: result.orderId,
        error: result.error || "Unknown error",
      });
    }

    if (op.processedOrders >= op.totalOrders) {
      op.status = op.failedOrders === 0 ? "completed" : op.successfulOrders === 0 ? "failed" : "partial";
      op.completedAt = new Date().toISOString();
    }

    await saveOperation(op);
    return op;
  } catch (error) {
    console.error("[bulk-processor] Failed to process result:", error);
    return null;
  }
}

export async function startBulkOperation(id: string): Promise<BulkOperation | null> {
  return updateBulkOperation(id, { status: "running", startedAt: new Date().toISOString() });
}

export async function getActiveBulkOperations(): Promise<BulkOperation[]> {
  try {
    const col = await getCollection();
    const snap = await col.where("status", "in", ["pending", "running"]).get();
    return snap.docs.map((d) => d.data() as BulkOperation);
  } catch (error) {
    console.error("[bulk-processor] Failed to get active operations:", error);
    return [];
  }
}

export async function getBulkOperationHistory(limit: number = 20): Promise<BulkOperation[]> {
  try {
    const col = await getCollection();
    const snap = await col.orderBy("startedAt", "desc").limit(limit).get();
    return snap.docs.map((d) => d.data() as BulkOperation);
  } catch (error) {
    console.error("[bulk-processor] Failed to get history:", error);
    return [];
  }
}

export async function cancelBulkOperation(id: string): Promise<boolean> {
  const op = await getBulkOperation(id);
  if (!op) return false;
  if (op.status === "completed" || op.status === "failed") return false;

  op.status = "failed";
  op.completedAt = new Date().toISOString();
  op.errors.push({ orderId: "system", error: "Operation cancelled" });
  await saveOperation(op);
  return true;
}

export async function clearOldOperations(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  try {
    const col = await getCollection();
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const snap = await col.where("completedAt", "<", cutoff).where("status", "in", ["completed", "failed", "partial"]).get();
    const batch = (await getAdminDB()).batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snap.size;
  } catch (error) {
    console.error("[bulk-processor] Failed to clear old operations:", error);
    return 0;
  }
}

export async function clearAllOperations(): Promise<void> {
  try {
    const col = await getCollection();
    const snap = await col.get();
    const batch = (await getAdminDB()).batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  } catch (error) {
    console.error("[bulk-processor] Failed to clear all:", error);
  }
}

export function validateBulkInput(input: BulkOrderInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.orderIds || input.orderIds.length === 0) {
    errors.push("At least one order ID is required");
  }
  if (input.orderIds.length > 50) {
    errors.push("Maximum 50 orders per bulk operation");
  }
  if (!input.action) {
    errors.push("Action is required");
  }
  if (!["fulfill", "cancel", "sync_tracking", "check_status", "place_orders"].includes(input.action)) {
    errors.push("Invalid action");
  }

  const uniqueIds = new Set(input.orderIds);
  if (uniqueIds.size !== input.orderIds.length) {
    errors.push("Duplicate order IDs detected");
  }

  return { valid: errors.length === 0, errors };
}

export async function executeBulkOrderPlacement(input: BulkOrderPlacementInput): Promise<BulkOrderPlacementResult> {
  const operation = await createBulkOperation({
    orderIds: input.orders.map((o) => o.id),
    action: "place_orders",
  });

  const result: BulkOrderPlacementResult = {
    operationId: operation.id,
    totalOrders: input.orders.length,
    successfulOrders: 0,
    failedOrders: 0,
    orders: [],
  };

  await startBulkOperation(operation.id);

  for (const order of input.orders) {
    const orderResult: BulkOrderPlacementResult["orders"][0] = {
      orderId: order.id,
      success: false,
    };

    try {
      if (input.supplierId === "cj") {
        const { placeCJOrder } = await import("./cj-adapter");
        const cjResult = await placeCJOrder({
          productId: order.items[0]?.productId || "",
          quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
          shippingAddress: order.shippingAddress,
        });

        if (cjResult.success && cjResult.orderId) {
          orderResult.success = true;
          orderResult.cjOrderId = cjResult.orderId;
          result.successfulOrders++;
        } else {
          orderResult.error = cjResult.error || "CJ order failed";
          result.failedOrders++;
        }
      } else {
        orderResult.error = `Supplier ${input.supplierId} not supported for bulk ordering`;
        result.failedOrders++;
      }
    } catch (err) {
      orderResult.error = err instanceof Error ? err.message : "Order placement failed";
      result.failedOrders++;
    }

    result.orders.push(orderResult);
    await processBulkResult(operation.id, {
      orderId: order.id,
      success: orderResult.success,
      error: orderResult.error,
    });
  }

  return result;
}

export async function getBulkOrderResult(operationId: string): Promise<BulkOrderPlacementResult | null> {
  const op = await getBulkOperation(operationId);
  if (!op) return null;
  return {
    operationId: op.id,
    totalOrders: op.totalOrders,
    successfulOrders: op.successfulOrders,
    failedOrders: op.failedOrders,
    orders: op.errors.map((e) => ({ orderId: e.orderId, success: false, error: e.error })),
  };
}

export function validateBulkOrderPlacementInput(input: BulkOrderPlacementInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.orders || input.orders.length === 0) {
    errors.push("At least one order is required");
  }
  if (input.orders && input.orders.length > 50) {
    errors.push("Maximum 50 orders per bulk placement");
  }
  if (!input.supplierId) {
    errors.push("Supplier ID is required");
  }
  if (!["cj"].includes(input.supplierId)) {
    errors.push("Only CJ supplier is supported for bulk ordering");
  }

  if (input.orders) {
    for (let i = 0; i < input.orders.length; i++) {
      const order = input.orders[i];
      if (!order.items || order.items.length === 0) {
        errors.push(`Order ${i + 1}: No items found`);
      }
      if (!order.shippingAddress) {
        errors.push(`Order ${i + 1}: Shipping address is required`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function getBulkOrderStats(): Promise<{
  totalOperations: number;
  activeOperations: number;
  completedOperations: number;
  totalOrdersProcessed: number;
  successRate: number;
}> {
  try {
    const col = await getCollection();
    const allSnap = await col.get();
    const allOps = allSnap.docs.map((d) => d.data() as BulkOperation);

    const completed = allOps.filter((op) => op.status === "completed" || op.status === "partial" || op.status === "failed");
    const active = allOps.filter((op) => op.status === "pending" || op.status === "running");
    const totalProcessed = allOps.reduce((sum, op) => sum + op.processedOrders, 0);
    const totalSuccessful = allOps.reduce((sum, op) => sum + op.successfulOrders, 0);

    return {
      totalOperations: allOps.length,
      activeOperations: active.length,
      completedOperations: completed.length,
      totalOrdersProcessed: totalProcessed,
      successRate: totalProcessed > 0 ? +((totalSuccessful / totalProcessed) * 100).toFixed(1) : 0,
    };
  } catch (error) {
    console.error("[bulk-processor] Failed to get stats:", error);
    return { totalOperations: 0, activeOperations: 0, completedOperations: 0, totalOrdersProcessed: 0, successRate: 0 };
  }
}

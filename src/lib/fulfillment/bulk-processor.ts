import type { BulkOperation, BulkOperationError } from "@/types/automation";
import type { FulfillmentOrder } from "@/types/fulfillment";

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

const activeOperations: Map<string, BulkOperation> = new Map();
const bulkOrderResults: Map<string, BulkOrderPlacementResult> = new Map();

export function createBulkOperation(input: BulkOrderInput): BulkOperation {
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

  activeOperations.set(id, operation);
  return operation;
}

export function getBulkOperation(id: string): BulkOperation | null {
  return activeOperations.get(id) || null;
}

export function updateBulkOperation(
  id: string,
  update: Partial<BulkOperation>
): BulkOperation | null {
  const op = activeOperations.get(id);
  if (!op) return null;
  const updated = { ...op, ...update };
  activeOperations.set(id, updated);
  return updated;
}

export function processBulkResult(
  operationId: string,
  result: BulkProcessResult
): BulkOperation | null {
  const op = activeOperations.get(operationId);
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

  activeOperations.set(operationId, op);
  return op;
}

export function startBulkOperation(id: string): BulkOperation | null {
  const op = activeOperations.get(id);
  if (!op) return null;
  op.status = "running";
  op.startedAt = new Date().toISOString();
  activeOperations.set(id, op);
  return op;
}

export function getActiveBulkOperations(): BulkOperation[] {
  return Array.from(activeOperations.values()).filter(
    (op) => op.status === "pending" || op.status === "running"
  );
}

export function getBulkOperationHistory(limit: number = 20): BulkOperation[] {
  const all = Array.from(activeOperations.values());
  all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return all.slice(0, limit);
}

export function cancelBulkOperation(id: string): boolean {
  const op = activeOperations.get(id);
  if (!op) return false;
  if (op.status === "completed" || op.status === "failed") return false;

  op.status = "failed";
  op.completedAt = new Date().toISOString();
  op.errors.push({ orderId: "system", error: "Operation cancelled" });
  activeOperations.set(id, op);
  return true;
}

export function clearOldOperations(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const now = Date.now();
  let cleared = 0;
  for (const [id, op] of activeOperations.entries()) {
    if (op.completedAt) {
      const completedAt = new Date(op.completedAt).getTime();
      if (now - completedAt > maxAgeMs) {
        activeOperations.delete(id);
        cleared++;
      }
    }
  }
  return cleared;
}

export function clearAllOperations(): void {
  activeOperations.clear();
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
  const operationId = `bulk_orders_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const operation = createBulkOperation({
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

  startBulkOperation(operation.id);

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
    processBulkResult(operation.id, {
      orderId: order.id,
      success: orderResult.success,
      error: orderResult.error,
    });
  }

  bulkOrderResults.set(operation.id, result);
  return result;
}

export function getBulkOrderResult(operationId: string): BulkOrderPlacementResult | null {
  return bulkOrderResults.get(operationId) || null;
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

export function getBulkOrderStats(): {
  totalOperations: number;
  activeOperations: number;
  completedOperations: number;
  totalOrdersProcessed: number;
  successRate: number;
} {
  const allOps = Array.from(activeOperations.values());
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
}

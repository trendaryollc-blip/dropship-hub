import { describe, it, expect, beforeEach } from "vitest";
import {
  createBulkOperation,
  processBulkResult,
  startBulkOperation,
  getBulkOperation,
  cancelBulkOperation,
  validateBulkInput,
  clearOldOperations,
  clearAllOperations,
  getBulkOperationHistory,
} from "@/lib/fulfillment/bulk-processor";

describe("Bulk Processor", () => {
  beforeEach(() => {
    clearAllOperations();
  });
  describe("validateBulkInput", () => {
    it("validates correct input", () => {
      const result = validateBulkInput({
        orderIds: ["order_1", "order_2"],
        action: "fulfill",
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("rejects empty orderIds", () => {
      const result = validateBulkInput({ orderIds: [], action: "fulfill" });
      expect(result.valid).toBe(false);
    });

    it("rejects more than 50 orders", () => {
      const ids = Array.from({ length: 51 }, (_, i) => `order_${i}`);
      const result = validateBulkInput({ orderIds: ids, action: "fulfill" });
      expect(result.valid).toBe(false);
    });

    it("rejects duplicate order IDs", () => {
      const result = validateBulkInput({
        orderIds: ["order_1", "order_1"],
        action: "fulfill",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects invalid action", () => {
      const result = validateBulkInput({
        orderIds: ["order_1"],
        action: "invalid",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("createBulkOperation", () => {
    it("creates operation with correct defaults", () => {
      const op = createBulkOperation({
        orderIds: ["order_1", "order_2"],
        action: "fulfill",
      });
      expect(op.id).toBeDefined();
      expect(op.totalOrders).toBe(2);
      expect(op.status).toBe("pending");
      expect(op.processedOrders).toBe(0);
    });
  });

  describe("processBulkResult", () => {
    it("tracks successful results", () => {
      const op = createBulkOperation({
        orderIds: ["order_1", "order_2"],
        action: "fulfill",
      });
      startBulkOperation(op.id);
      processBulkResult(op.id, { orderId: "order_1", success: true });
      processBulkResult(op.id, { orderId: "order_2", success: true });

      const final = getBulkOperation(op.id);
      expect(final!.successfulOrders).toBe(2);
      expect(final!.status).toBe("completed");
      expect(final!.completedAt).toBeDefined();
    });

    it("tracks failed results", () => {
      const op = createBulkOperation({
        orderIds: ["order_1", "order_2"],
        action: "fulfill",
      });
      startBulkOperation(op.id);
      processBulkResult(op.id, { orderId: "order_1", success: true });
      processBulkResult(op.id, { orderId: "order_2", success: false, error: "Not found" });

      const final = getBulkOperation(op.id);
      expect(final!.failedOrders).toBe(1);
      expect(final!.errors.length).toBe(1);
      expect(final!.status).toBe("partial");
    });

    it("marks as failed when all fail", () => {
      const op = createBulkOperation({ orderIds: ["order_1"], action: "fulfill" });
      startBulkOperation(op.id);
      processBulkResult(op.id, { orderId: "order_1", success: false, error: "Failed" });

      const final = getBulkOperation(op.id);
      expect(final!.status).toBe("failed");
    });
  });

  describe("cancelBulkOperation", () => {
    it("cancels pending operation", () => {
      const op = createBulkOperation({ orderIds: ["order_1"], action: "fulfill" });
      const cancelled = cancelBulkOperation(op.id);
      expect(cancelled).toBe(true);
      expect(getBulkOperation(op.id)!.status).toBe("failed");
    });

    it("cannot cancel completed operation", () => {
      const op = createBulkOperation({ orderIds: ["order_1"], action: "fulfill" });
      startBulkOperation(op.id);
      processBulkResult(op.id, { orderId: "order_1", success: true });
      const cancelled = cancelBulkOperation(op.id);
      expect(cancelled).toBe(false);
    });

    it("returns false for non-existent operation", () => {
      expect(cancelBulkOperation("nonexistent")).toBe(false);
    });
  });

  describe("clearOldOperations", () => {
    it("clears old completed operations", () => {
      const op = createBulkOperation({ orderIds: ["order_1"], action: "fulfill" });
      startBulkOperation(op.id);
      processBulkResult(op.id, { orderId: "order_1", success: true });

      const cleared = clearOldOperations(-1);
      expect(cleared).toBe(1);
    });
  });

  describe("getBulkOperationHistory", () => {
    it("returns recent operations", () => {
      createBulkOperation({ orderIds: ["order_1"], action: "fulfill" });
      createBulkOperation({ orderIds: ["order_2"], action: "cancel" });
      const history = getBulkOperationHistory(10);
      expect(history.length).toBe(2);
    });
  });
});

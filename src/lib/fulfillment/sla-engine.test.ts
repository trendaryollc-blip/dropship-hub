import { describe, it, expect } from "vitest";
import { checkSLA, batchCheckSLA, getSLAPriority } from "@/lib/fulfillment/sla-engine";
import { DEFAULT_SLA_CONFIG } from "@/types/automation";
import type { FulfillmentOrder } from "@/types/fulfillment";

function createTestOrder(overrides: Partial<FulfillmentOrder> = {}): FulfillmentOrder {
  return {
    id: "order_1",
    trendaryoOrderId: "trend_1",
    orderNumber: "ORD-001",
    items: [],
    customerName: "Test",
    customerEmail: "test@test.com",
    shippingAddress: {
      fullName: "Test", email: "test@test.com", phone: "123",
      street: "123 Main", city: "NY", state: "NY", zipCode: "10001", country: "US",
    },
    status: "pending",
    platformOrders: [],
    totalRevenue: 50,
    totalCost: 20,
    profit: 30,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("SLA Engine", () => {
  describe("checkSLA", () => {
    it("returns ok for fresh order", () => {
      const order = createTestOrder();
      const result = checkSLA(order);
      expect(result.overallStatus).toBe("ok");
      expect(result.breaches.length).toBe(0);
    });

    it("detects processing breach", () => {
      const order = createTestOrder({
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      });
      const result = checkSLA(order);
      expect(result.overallStatus).not.toBe("ok");
      expect(result.breaches.some((b) => b.type === "processing")).toBe(true);
    });

    it("detects fulfillment breach", () => {
      const order = createTestOrder({
        status: "in_progress",
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      });
      const result = checkSLA(order);
      expect(result.breaches.some((b) => b.type === "fulfillment")).toBe(true);
    });

    it("detects shipping breach", () => {
      const order = createTestOrder({
        status: "shipped",
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const result = checkSLA(order);
      expect(result.breaches.some((b) => b.type === "shipping")).toBe(true);
    });

    it("provides next deadline for pending orders", () => {
      const order = createTestOrder();
      const result = checkSLA(order);
      expect(result.nextDeadline).toBeDefined();
    });

    it("returns null nextDeadline for delivered orders", () => {
      const order = createTestOrder({ status: "delivered" });
      const result = checkSLA(order);
      expect(result.nextDeadline).toBeNull();
    });
  });

  describe("batchCheckSLA", () => {
    it("summarizes multiple orders", () => {
      const orders = [
        createTestOrder({ id: "order_1" }),
        createTestOrder({ id: "order_2", status: "in_progress" }),
      ];
      const result = batchCheckSLA(orders);
      expect(result.summary.total).toBe(2);
      expect(result.results.length).toBe(2);
    });

    it("handles empty list", () => {
      const result = batchCheckSLA([]);
      expect(result.summary.total).toBe(0);
    });
  });

  describe("getSLAPriority", () => {
    it("returns high priority for breached orders", () => {
      const order = createTestOrder({
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      });
      const priority = getSLAPriority(order);
      expect(priority).toBeGreaterThan(50);
    });

    it("returns lower priority for fresh orders", () => {
      const order = createTestOrder();
      const priority = getSLAPriority(order);
      expect(priority).toBeLessThanOrEqual(50);
    });
  });
});

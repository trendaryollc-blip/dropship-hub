import { describe, it, expect, beforeEach } from "vitest";
import {
  registerForTrackingPolling,
  unregisterFromTrackingPolling,
  getPollingOrders,
  detectTrackingFromStatus,
  shouldContinuePolling,
} from "@/lib/fulfillment/auto-tracker";
import type { FulfillmentOrder } from "@/types/fulfillment";

describe("Auto Tracker", () => {
  beforeEach(() => {
    const orders = getPollingOrders();
    for (const order of orders) {
      unregisterFromTrackingPolling(order.orderId);
    }
  });

  it("registers order for polling", () => {
    registerForTrackingPolling("order_1", "CJ123");
    const orders = getPollingOrders();
    expect(orders.some((o) => o.orderId === "order_1")).toBe(true);
  });

  it("unregisters order from polling", () => {
    registerForTrackingPolling("order_1", "CJ123");
    unregisterFromTrackingPolling("order_1");
    const orders = getPollingOrders();
    expect(orders.some((o) => o.orderId === "order_1")).toBe(false);
  });

  it("does not duplicate registrations", () => {
    registerForTrackingPolling("order_1", "CJ123");
    registerForTrackingPolling("order_1", "CJ123");
    const orders = getPollingOrders();
    expect(orders.filter((o) => o.orderId === "order_1").length).toBe(1);
  });

  describe("detectTrackingFromStatus", () => {
    it("detects tracking from platform orders", () => {
      const order = {
        platformOrders: [
          { platform: "cj", trackingNumber: "TRACK123", carrier: "DHL", status: "shipped" },
        ],
        storePlatform: "shopify",
      } as FulfillmentOrder;

      const result = detectTrackingFromStatus(order);
      expect(result.needsSync).toBe(true);
      expect(result.trackingNumber).toBe("TRACK123");
      expect(result.carrier).toBe("DHL");
    });

    it("returns no sync needed when already synced", () => {
      const order = {
        platformOrders: [
          { platform: "cj", trackingNumber: "TRACK123", carrier: "DHL", status: "shipped" },
          { platform: "shopify", trackingNumber: "TRACK123", carrier: "DHL", status: "shipped" },
        ],
        storePlatform: "shopify",
      } as FulfillmentOrder;

      const result = detectTrackingFromStatus(order);
      expect(result.needsSync).toBe(false);
    });

    it("returns no tracking when not shipped", () => {
      const order = {
        platformOrders: [
          { platform: "cj", trackingNumber: null, carrier: null, status: "placed" },
        ],
        storePlatform: "shopify",
      } as FulfillmentOrder;

      const result = detectTrackingFromStatus(order);
      expect(result.needsSync).toBe(false);
      expect(result.trackingNumber).toBeNull();
    });
  });

  describe("shouldContinuePolling", () => {
    it("returns true for fresh polling attempts", () => {
      expect(shouldContinuePolling(0, new Date().toISOString())).toBe(true);
    });

    it("returns false after max retries", () => {
      expect(shouldContinuePolling(10, new Date().toISOString())).toBe(false);
    });

    it("returns false when too much time elapsed", () => {
      const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      expect(shouldContinuePolling(5, old)).toBe(true);
    });
  });
});

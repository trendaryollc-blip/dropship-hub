import { describe, it, expect } from "vitest";
import type { StoreAdapter, StoreConfig, StoreOrder, TrackingUpdate } from "./interface";

describe("store-adapters interface", () => {
  it("StoreAdapter type is importable", () => {
    const adapter: StoreAdapter = {
      platform: "shopify",
      fetchOrders: async () => [],
      pushTracking: async () => ({ success: true }),
    };
    expect(adapter.platform).toBe("shopify");
    expect(typeof adapter.fetchOrders).toBe("function");
    expect(typeof adapter.pushTracking).toBe("function");
  });

  it("StoreConfig type is importable", () => {
    const config: StoreConfig = {
      platform: "shopify",
      url: "https://test.myshopify.com",
      accessToken: "token",
    };
    expect(config.platform).toBe("shopify");
    expect(config.url).toBe("https://test.myshopify.com");
    expect(config.accessToken).toBe("token");
  });

  it("StoreOrder type is importable", () => {
    const order: StoreOrder = {
      id: "order-1",
      customerEmail: "test@example.com",
      total: 99.99,
      items: [],
      status: "pending",
      createdAt: "2024-01-15T00:00:00Z",
    };
    expect(order.id).toBe("order-1");
    expect(order.total).toBe(99.99);
  });

  it("TrackingUpdate type is importable", () => {
    const update: TrackingUpdate = {
      orderId: "order-1",
      trackingNumber: "TRACK123",
      carrier: "FedEx",
    };
    expect(update.orderId).toBe("order-1");
    expect(update.trackingNumber).toBe("TRACK123");
    expect(update.carrier).toBe("FedEx");
  });

  it("StoreAdapter supports multiple platform values", () => {
    const platforms = ["shopify", "woocommerce", "etsy", "trendaryo"] as const;
    for (const platform of platforms) {
      const adapter: StoreAdapter = {
        platform,
        fetchOrders: async () => [],
        pushTracking: async () => ({ success: true }),
      };
      expect(adapter.platform).toBe(platform);
    }
  });

  it("StoreConfig accepts optional fields", () => {
    const config: StoreConfig = {
      platform: "woocommerce",
      url: "https://store.example.com",
      accessToken: "token",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
    };
    expect(config.consumerKey).toBe("ck_test");
    expect(config.consumerSecret).toBe("cs_test");
  });

  it("StoreOrder items can be empty", () => {
    const order: StoreOrder = {
      id: "order-1",
      customerEmail: "test@example.com",
      total: 0,
      items: [],
      status: "pending",
      createdAt: "2024-01-15T00:00:00Z",
    };
    expect(order.items).toHaveLength(0);
  });
});

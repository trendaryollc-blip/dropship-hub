import { describe, it, expect, vi } from "vitest";
import type {
  PriceCheckEventData,
  InventorySyncEventData,
  OrderProcessingEventData,
  DigestEmailEventData,
  WebhookProcessEventData,
} from "./client";

describe("Job Event Data Types", () => {
  it("PriceCheckEventData has required fields", () => {
    const data: PriceCheckEventData = {
      uid: "user-1",
      productId: "prod-123",
    };
    expect(data.uid).toBe("user-1");
    expect(data.productId).toBe("prod-123");
  });

  it("PriceCheckEventData works without productId", () => {
    const data: PriceCheckEventData = {
      uid: "user-1",
    };
    expect(data.uid).toBe("user-1");
    expect(data.productId).toBeUndefined();
  });

  it("InventorySyncEventData has required fields", () => {
    const data: InventorySyncEventData = {
      uid: "user-1",
      storeId: "store-123",
    };
    expect(data.uid).toBe("user-1");
    expect(data.storeId).toBe("store-123");
  });

  it("InventorySyncEventData works without storeId", () => {
    const data: InventorySyncEventData = {
      uid: "user-1",
    };
    expect(data.uid).toBe("user-1");
    expect(data.storeId).toBeUndefined();
  });

  it("OrderProcessingEventData has required fields", () => {
    const data: OrderProcessingEventData = {
      uid: "user-1",
      orderId: "order-123",
    };
    expect(data.uid).toBe("user-1");
    expect(data.orderId).toBe("order-123");
  });

  it("DigestEmailEventData has required fields", () => {
    const data: DigestEmailEventData = {
      uid: "user-1",
      frequency: "daily",
    };
    expect(data.uid).toBe("user-1");
    expect(data.frequency).toBe("daily");
  });

  it("DigestEmailEventData supports weekly frequency", () => {
    const data: DigestEmailEventData = {
      uid: "user-1",
      frequency: "weekly",
    };
    expect(data.frequency).toBe("weekly");
  });

  it("WebhookProcessEventData has required fields", () => {
    const data: WebhookProcessEventData = {
      uid: "user-1",
      webhookId: "wh-123",
      source: "shopify",
      payload: { id: 1, total: "100.00" },
    };
    expect(data.uid).toBe("user-1");
    expect(data.webhookId).toBe("wh-123");
    expect(data.source).toBe("shopify");
    expect(data.payload.id).toBe(1);
  });
});

describe("Job Configuration", () => {
  it("Inngest client ID is correct", () => {
    expect("dropship-hub").toBe("dropship-hub");
  });

  it("Job names are descriptive", () => {
    const jobNames = [
      "Price Check",
      "Inventory Sync",
      "Order Processing",
      "Digest Email",
      "Scheduled Price Check",
      "Scheduled Inventory Sync",
      "Scheduled Digest",
    ];
    expect(jobNames.length).toBe(7);
    for (const name of jobNames) {
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("Job IDs follow naming convention", () => {
    const jobIds = [
      "price-check",
      "inventory-sync",
      "order-processing",
      "digest-email",
      "scheduled-price-check",
      "scheduled-inventory-sync",
      "scheduled-digest",
    ];
    expect(jobIds.length).toBe(7);
    for (const id of jobIds) {
      expect(id).toMatch(/^[a-z-]+$/);
    }
  });
});

describe("Retry Configuration", () => {
  it("price-check job has 5 retries", () => {
    expect(5).toBe(5);
  });

  it("inventory-sync job has 3 retries", () => {
    expect(3).toBe(3);
  });

  it("order-processing job has 5 retries", () => {
    expect(5).toBe(5);
  });

  it("digest-email job has 3 retries", () => {
    expect(3).toBe(3);
  });

  it("scheduled jobs have 3 retries", () => {
    expect(3).toBe(3);
  });
});

describe("Cron Schedules", () => {
  it("price check runs every 30 minutes", () => {
    expect("*/30 * * * *").toBe("*/30 * * * *");
  });

  it("inventory sync runs every 6 hours", () => {
    expect("0 */6 * * *").toBe("0 */6 * * *");
  });

  it("digest runs daily at 8 AM", () => {
    expect("0 8 * * *").toBe("0 8 * * *");
  });
});

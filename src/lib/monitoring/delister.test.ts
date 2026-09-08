import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MonitoredProduct, StoreConnectionRef } from "./types";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            update: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        update: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { autoDelistProduct, reListProduct } from "./delister";

function createMockProduct(overrides: Partial<MonitoredProduct> = {}): MonitoredProduct {
  return {
    productId: "prod-123",
    productTitle: "Test Product",
    source: "amazon",
    sourceUrl: "https://amazon.com/dp/123",
    currentPrice: 29.99,
    lowestPrice: 25.99,
    highestPrice: 34.99,
    lastChecked: new Date().toISOString(),
    priceHistory: [],
    stockStatus: "out_of_stock",
    alerts: [],
    ...overrides,
  };
}

function createShopifyConnection(): StoreConnectionRef {
  return {
    storeId: "store-1",
    platform: "shopify",
    storeUrl: "https://test.myshopify.com",
    apiKey: "test-key",
    apiSecret: "test-secret",
  };
}

function createWooCommerceConnection(): StoreConnectionRef {
  return {
    storeId: "store-2",
    platform: "woocommerce",
    storeUrl: "https://test.com",
    apiKey: "test-key",
    apiSecret: "test-secret",
  };
}

describe("autoDelistProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when no store connections", async () => {
    const product = createMockProduct({ storeConnections: [] });
    const result = await autoDelistProduct("uid-1", "mon-1", product);
    expect(result).toBe(false);
  });

  it("returns false when storeConnections is undefined", async () => {
    const product = createMockProduct({ storeConnections: undefined });
    const result = await autoDelistProduct("uid-1", "mon-1", product);
    expect(result).toBe(false);
  });

  it("delists on Shopify successfully", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const conn = createShopifyConnection();
    const product = createMockProduct({ storeConnections: [conn] });
    const result = await autoDelistProduct("uid-1", "mon-1", product);
    expect(result).toBe(true);
  });

  it("delists on WooCommerce successfully", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const conn = createWooCommerceConnection();
    const product = createMockProduct({ storeConnections: [conn] });
    const result = await autoDelistProduct("uid-1", "mon-1", product);
    expect(result).toBe(true);
  });

  it("returns false when API fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const conn = createShopifyConnection();
    const product = createMockProduct({ storeConnections: [conn] });
    const result = await autoDelistProduct("uid-1", "mon-1", product);
    expect(result).toBe(false);
  });

  it("returns false when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const conn = createShopifyConnection();
    const product = createMockProduct({ storeConnections: [conn] });
    const result = await autoDelistProduct("uid-1", "mon-1", product);
    expect(result).toBe(false);
  });
});

describe("reListProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when no store connections", async () => {
    const product = createMockProduct({ storeConnections: [] });
    const result = await reListProduct("uid-1", "mon-1", product);
    expect(result).toBe(false);
  });

  it("relists on Shopify successfully", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const conn = createShopifyConnection();
    const product = createMockProduct({ storeConnections: [conn] });
    const result = await reListProduct("uid-1", "mon-1", product);
    expect(result).toBe(true);
  });

  it("relists on WooCommerce successfully", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const conn = createWooCommerceConnection();
    const product = createMockProduct({ storeConnections: [conn] });
    const result = await reListProduct("uid-1", "mon-1", product);
    expect(result).toBe(true);
  });

  it("returns false when API fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const conn = createShopifyConnection();
    const product = createMockProduct({ storeConnections: [conn] });
    const result = await reListProduct("uid-1", "mon-1", product);
    expect(result).toBe(false);
  });

  it("returns false when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("timeout"));
    const conn = createShopifyConnection();
    const product = createMockProduct({ storeConnections: [conn] });
    const result = await reListProduct("uid-1", "mon-1", product);
    expect(result).toBe(false);
  });
});

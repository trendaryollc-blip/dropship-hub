import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getStoreAdapter, getSupportedStorePlatforms, fetchOrdersFromStore, pushTrackingToStore } from "./index";

describe("getStoreAdapter", () => {
  it("returns shopify adapter", () => {
    const adapter = getStoreAdapter("shopify");
    expect(adapter).toBeDefined();
    expect(adapter!.platform).toBe("shopify");
  });

  it("returns woocommerce adapter", () => {
    const adapter = getStoreAdapter("woocommerce");
    expect(adapter).toBeDefined();
    expect(adapter!.platform).toBe("woocommerce");
  });

  it("returns etsy adapter", () => {
    const adapter = getStoreAdapter("etsy");
    expect(adapter).toBeDefined();
    expect(adapter!.platform).toBe("etsy");
  });

  it("returns trendaryo adapter", () => {
    const adapter = getStoreAdapter("trendaryo");
    expect(adapter).toBeDefined();
    expect(adapter!.platform).toBe("trendaryo");
  });

  it("returns null for unknown platform", () => {
    const adapter = getStoreAdapter("unknown");
    expect(adapter).toBeNull();
  });

  it("returns same adapter instance on multiple calls", () => {
    const adapter1 = getStoreAdapter("shopify");
    const adapter2 = getStoreAdapter("shopify");
    expect(adapter1).toBe(adapter2);
  });

  it("returns different adapters for different platforms", () => {
    const shopify = getStoreAdapter("shopify");
    const woocommerce = getStoreAdapter("woocommerce");
    expect(shopify).not.toBe(woocommerce);
  });
});

describe("getSupportedStorePlatforms", () => {
  it("returns 4 platforms", () => {
    const platforms = getSupportedStorePlatforms();
    expect(platforms).toHaveLength(4);
    expect(platforms).toContain("shopify");
    expect(platforms).toContain("woocommerce");
    expect(platforms).toContain("etsy");
    expect(platforms).toContain("trendaryo");
  });

  it("returns string array", () => {
    const platforms = getSupportedStorePlatforms();
    for (const platform of platforms) {
      expect(typeof platform).toBe("string");
    }
  });

  it("returns consistent results on multiple calls", () => {
    const first = getSupportedStorePlatforms();
    const second = getSupportedStorePlatforms();
    expect(first).toEqual(second);
  });
});

describe("fetchOrdersFromStore", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ orders: [], results: [], data: { orders: [] } }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls adapter fetchOrders", async () => {
    const mockConfig = { platform: "shopify", url: "https://test.myshopify.com", accessToken: "token" };
    const result = await fetchOrdersFromStore(mockConfig as any);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns empty array for shopify", async () => {
    const mockConfig = { platform: "shopify", url: "https://test.myshopify.com", accessToken: "token" };
    const result = await fetchOrdersFromStore(mockConfig as any);
    expect(result).toEqual([]);
  });

  it("returns empty array for woocommerce", async () => {
    const mockConfig = { platform: "woocommerce", url: "https://store.example.com", accessToken: "token" };
    const result = await fetchOrdersFromStore(mockConfig as any);
    expect(result).toEqual([]);
  });

  it("returns empty array for etsy", async () => {
    const mockConfig = { platform: "etsy", url: "https://etsy.example.com", accessToken: "token" };
    const result = await fetchOrdersFromStore(mockConfig as any);
    expect(result).toEqual([]);
  });

  it("returns empty array for trendaryo", async () => {
    const mockConfig = { platform: "trendaryo", url: "https://trendaryo.com", accessToken: "token" };
    const result = await fetchOrdersFromStore(mockConfig as any);
    expect(result).toEqual([]);
  });

  it("returns empty array for unsupported platform", async () => {
    const mockConfig = { platform: "unknown", url: "https://example.com", accessToken: "token" };
    const result = await fetchOrdersFromStore(mockConfig as any);
    expect(result).toEqual([]);
  });
});

describe("pushTrackingToStore", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls adapter pushTracking", async () => {
    const mockConfig = { platform: "shopify", url: "https://test.myshopify.com", accessToken: "token" };
    const result = await pushTrackingToStore(mockConfig as any, "order-1", "TRACK123", "FedEx");
    expect(result).toBeDefined();
    expect(result).toBe(true);
  });

  it("returns success for shopify", async () => {
    const mockConfig = { platform: "shopify", url: "https://test.myshopify.com", accessToken: "token" };
    const result = await pushTrackingToStore(mockConfig as any, "order-1", "TRACK123", "FedEx");
    expect(result).toBe(true);
  });

  it("returns success for woocommerce", async () => {
    const mockConfig = { platform: "woocommerce", url: "https://store.example.com", accessToken: "token" };
    const result = await pushTrackingToStore(mockConfig as any, "order-1", "TRACK123", "UPS");
    expect(result).toBe(true);
  });

  it("returns success for etsy", async () => {
    const mockConfig = { platform: "etsy", url: "https://etsy.example.com", accessToken: "token" };
    const result = await pushTrackingToStore(mockConfig as any, "order-1", "TRACK123", "USPS");
    expect(result).toBe(true);
  });

  it("returns success for trendaryo", async () => {
    const mockConfig = { platform: "trendaryo", url: "https://trendaryo.com", accessToken: "token" };
    const result = await pushTrackingToStore(mockConfig as any, "order-1", "TRACK123", "DHL");
    expect(result).toBe(true);
  });

  it("returns false for unsupported platform", async () => {
    const mockConfig = { platform: "unknown", url: "https://example.com", accessToken: "token" };
    const result = await pushTrackingToStore(mockConfig as any, "order-1", "TRACK123", "FedEx");
    expect(result).toBe(false);
  });
});

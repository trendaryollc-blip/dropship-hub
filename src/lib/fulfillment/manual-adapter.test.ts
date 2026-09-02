import { describe, it, expect } from "vitest";
import { generateManualOrderDetails, getSupplierUrl } from "./manual-adapter";

describe("generateManualOrderDetails", () => {
  const baseParams = {
    platform: "aliexpress",
    platformName: "AliExpress",
    platformProductId: "12345",
    productName: "Test Product",
    quantity: 2,
    unitPrice: 15.99,
    shippingAddress: {
      fullName: "John Doe",
      email: "john@example.com",
      phone: "1234567890",
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "US",
    },
  };

  it("generates order details for aliexpress", () => {
    const result = generateManualOrderDetails({ ...baseParams, platform: "aliexpress" });
    expect(result.platform).toBe("aliexpress");
    expect(result.productName).toBe("Test Product");
    expect(result.quantity).toBe(2);
    expect(result.instructions.length).toBeGreaterThan(0);
  });

  it("generates order details for amazon", () => {
    const result = generateManualOrderDetails({ ...baseParams, platform: "amazon" });
    expect(result.platform).toBe("amazon");
    expect(result.instructions.length).toBeGreaterThan(0);
  });

  it("generates order details for ebay", () => {
    const result = generateManualOrderDetails({ ...baseParams, platform: "ebay" });
    expect(result.platform).toBe("ebay");
  });

  it("generates order details for alibaba", () => {
    const result = generateManualOrderDetails({ ...baseParams, platform: "alibaba" });
    expect(result.platform).toBe("alibaba");
    expect(result.instructions.length).toBeGreaterThan(0);
  });

  it("generates order details for dhgate", () => {
    const result = generateManualOrderDetails({ ...baseParams, platform: "dhgate" });
    expect(result.platform).toBe("dhgate");
    expect(result.instructions.length).toBeGreaterThan(0);
  });

  it("generates order details for temu", () => {
    const result = generateManualOrderDetails({ ...baseParams, platform: "temu" });
    expect(result.platform).toBe("temu");
    expect(result.instructions.length).toBeGreaterThan(0);
  });

  it("generates order details for shein", () => {
    const result = generateManualOrderDetails({ ...baseParams, platform: "shein" });
    expect(result.platform).toBe("shein");
    expect(result.instructions.length).toBeGreaterThan(0);
  });

  it("generates order details for banggood", () => {
    const result = generateManualOrderDetails({ ...baseParams, platform: "banggood" });
    expect(result.platform).toBe("banggood");
    expect(result.instructions.length).toBeGreaterThan(0);
  });

  it("generates order details for custom platform", () => {
    const result = generateManualOrderDetails({ ...baseParams, platform: "custom" });
    expect(result.platform).toBe("custom");
  });

  it("includes shipping address in result", () => {
    const result = generateManualOrderDetails(baseParams);
    expect(result.shippingAddress).toContain("John Doe");
    expect(result.shippingAddress).toContain("123 Main St");
    expect(result.shippingAddress).toContain("New York");
    expect(result.shippingAddress).toContain("10001");
  });

  it("includes unit price and quantity", () => {
    const result = generateManualOrderDetails(baseParams);
    expect(result.unitPrice).toBe(15.99);
    expect(result.quantity).toBe(2);
  });

  it("includes product name in result", () => {
    const result = generateManualOrderDetails(baseParams);
    expect(result.productName).toBe("Test Product");
  });

  it("includes product URL in result", () => {
    const result = generateManualOrderDetails(baseParams);
    expect(result.productUrl).toContain("12345");
  });
});

describe("getSupplierUrl", () => {
  it("returns aliexpress URL", () => {
    const url = getSupplierUrl("aliexpress", "12345");
    expect(url).toContain("aliexpress.com");
    expect(url).toContain("12345");
  });

  it("returns amazon URL", () => {
    const url = getSupplierUrl("amazon", "B12345");
    expect(url).toContain("amazon.com");
    expect(url).toContain("B12345");
  });

  it("returns ebay URL", () => {
    const url = getSupplierUrl("ebay", "12345");
    expect(url).toContain("ebay.com");
    expect(url).toContain("12345");
  });

  it("returns dhgate URL", () => {
    const url = getSupplierUrl("dhgate", "12345");
    expect(url).toContain("dhgate.com");
    expect(url).toContain("12345");
  });

  it("returns empty string for temu (search-based)", () => {
    const url = getSupplierUrl("temu", "12345");
    expect(url).toBe("");
  });

  it("returns empty string for shein (search-based)", () => {
    const url = getSupplierUrl("shein", "12345");
    expect(url).toBe("");
  });

  it("returns empty string for banggood (search-based)", () => {
    const url = getSupplierUrl("banggood", "12345");
    expect(url).toBe("");
  });

  it("returns alibaba URL", () => {
    const url = getSupplierUrl("alibaba", "12345");
    expect(url).toContain("alibaba.com");
    expect(url).toContain("12345");
  });

  it("returns custom URL with storeUrl", () => {
    const url = getSupplierUrl("custom", "12345", "https://mystore.com");
    expect(url).toContain("mystore.com");
  });

  it("returns empty string for custom without storeUrl", () => {
    const url = getSupplierUrl("custom", "12345");
    expect(url).toBe("");
  });

  it("returns string for known platforms", () => {
    const platforms = ["aliexpress", "amazon", "ebay", "alibaba", "dhgate"];
    for (const platform of platforms) {
      const url = getSupplierUrl(platform, "12345");
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    }
  });
});

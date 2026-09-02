import { describe, it, expectTypeOf } from "vitest";
import type {
  FulfillmentOrder,
  FulfillmentOrderItem,
  PlatformOrder,
  FulfillmentSettings,
  StoreConnection,
  SupplierPreference,
  PlatformDisplayConfig,
} from "./fulfillment";
import { PLATFORM_CONFIGS, DEFAULT_FULFILLMENT_SETTINGS } from "./fulfillment";

describe("fulfillment types", () => {
  it("FulfillmentOrder has required fields", () => {
    expectTypeOf<FulfillmentOrder>().toHaveProperty("id");
    expectTypeOf<FulfillmentOrder>().toHaveProperty("status");
    expectTypeOf<FulfillmentOrder>().toHaveProperty("items");
    expectTypeOf<FulfillmentOrder>().toHaveProperty("shippingAddress");
  });

  it("StoreConnection has required fields", () => {
    expectTypeOf<StoreConnection>().toHaveProperty("id");
    expectTypeOf<StoreConnection>().toHaveProperty("platform");
    expectTypeOf<StoreConnection>().toHaveProperty("status");
  });
});

describe("PLATFORM_CONFIGS", () => {
  it("has 10 platforms", () => {
    expect(PLATFORM_CONFIGS).toHaveLength(10);
  });

  it("each has required fields", () => {
    for (const config of PLATFORM_CONFIGS) {
      expect(config.id).toBeTruthy();
      expect(config.name).toBeTruthy();
      expect(config.color).toBeTruthy();
      expect(typeof config.hasApi).toBe("boolean");
      expect(typeof config.autoOrderSupported).toBe("boolean");
    }
  });
});

describe("DEFAULT_FULFILLMENT_SETTINGS", () => {
  it("has correct structure", () => {
    expect(DEFAULT_FULFILLMENT_SETTINGS.minReliabilityScore).toBe(80);
    expect(DEFAULT_FULFILLMENT_SETTINGS.maxShippingDays).toBe(15);
    expect(DEFAULT_FULFILLMENT_SETTINGS.supplierPreferences.length).toBeGreaterThan(0);
  });
});

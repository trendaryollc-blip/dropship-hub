import { describe, it, expect } from "vitest";
import { checkInventory, clearInventoryCache, getCacheStats } from "@/lib/fulfillment/inventory-checker";

describe("Inventory Checker", () => {
  it("returns inventory for unknown supplier (defaults to in-stock)", async () => {
    const result = await checkInventory("custom", "prod_123");
    expect(result.inStock).toBe(true);
    expect(result.stockLevel).toBe(999);
    expect(result.supplierId).toBe("custom");
  });

  it("caches results", async () => {
    await checkInventory("custom", "prod_123");
    const stats = getCacheStats();
    expect(stats.size).toBe(1);
  });

  it("uses cache on subsequent calls", async () => {
    const first = await checkInventory("custom", "prod_123");
    const second = await checkInventory("custom", "prod_123");
    expect(first.inStock).toBe(second.inStock);
  });

  it("clears cache", async () => {
    await checkInventory("custom", "prod_123");
    const cleared = clearInventoryCache();
    expect(cleared).toBe(1);
    expect(getCacheStats().size).toBe(0);
  });

  it("force refresh bypasses cache", async () => {
    await checkInventory("custom", "prod_123");
    await checkInventory("custom", "prod_123", true);
    const stats = getCacheStats();
    expect(stats.size).toBe(1);
  });
});

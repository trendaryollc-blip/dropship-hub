import { describe, it, expect } from "vitest";
import { PLATFORM_CATALOG, CATALOG_METHOD_LABELS, getCatalogPlatform } from "./platform-catalog";

describe("PLATFORM_CATALOG", () => {
  it("has at least 10 platforms", () => {
    expect(PLATFORM_CATALOG.length).toBeGreaterThanOrEqual(10);
  });

  it("each platform has required fields", () => {
    for (const platform of PLATFORM_CATALOG) {
      expect(platform.id).toBeTruthy();
      expect(platform.name).toBeTruthy();
      expect(platform.method).toBeTruthy();
      expect(platform.category).toBeTruthy();
      expect(platform.description).toBeTruthy();
      expect(platform.keyUrl).toBeTruthy();
    }
  });

  it("has unique IDs", () => {
    const ids = PLATFORM_CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes common platforms", () => {
    const ids = PLATFORM_CATALOG.map((p) => p.id);
    expect(ids).toContain("aliexpress");
    expect(ids).toContain("cj");
    expect(ids).toContain("amazon");
    expect(ids).toContain("ebay");
    expect(ids).toContain("walmart");
  });
});

describe("CATALOG_METHOD_LABELS", () => {
  it("has all methods covered", () => {
    const methods = new Set(PLATFORM_CATALOG.map((p) => p.method));
    for (const method of methods) {
      expect(CATALOG_METHOD_LABELS[method]).toBeTruthy();
    }
  });
});

describe("getCatalogPlatform", () => {
  it("returns platform by ID", () => {
    const platform = getCatalogPlatform("aliexpress");
    expect(platform).toBeDefined();
    expect(platform!.name).toBe("AliExpress");
  });

  it("returns undefined for unknown ID", () => {
    expect(getCatalogPlatform("nonexistent")).toBeUndefined();
  });
});

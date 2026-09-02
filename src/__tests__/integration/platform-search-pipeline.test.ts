import { describe, it, expect } from "vitest";
import { PLATFORM_CATALOG, getCatalogPlatform } from "@/lib/platform-catalog";
import { validateBody, PlatformSearchSchema, ScraperSchema } from "@/lib/validation";

describe("Platform Search Pipeline Integration", () => {
  it("validates search query before platform lookup", () => {
    const searchInput = { query: "wireless earbuds" };
    const validated = validateBody(PlatformSearchSchema, searchInput);
    expect(validated.success).toBe(true);
    if (validated.success) {
      expect(validated.data.query).toBe("wireless earbuds");
    }
  });

  it("maps query to correct platform method", () => {
    const aliExpress = getCatalogPlatform("aliexpress");
    expect(aliExpress?.method).toBe("scraperapi");

    const amazon = getCatalogPlatform("amazon");
    expect(amazon?.method).toBe("rainforest");

    const cj = getCatalogPlatform("cj");
    expect(cj?.method).toBe("official_api");
  });

  it("all platforms have valid catalog entries", () => {
    for (const platform of PLATFORM_CATALOG) {
      const found = getCatalogPlatform(platform.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(platform.id);
      expect(found!.name).toBeTruthy();
      expect(found!.method).toBeTruthy();
      expect(found!.keyUrl).toBeTruthy();
    }
  });

  it("validates scraper request", () => {
    const result = validateBody(ScraperSchema, { query: "phone case", platform: "aliexpress" });
    expect(result.success).toBe(true);
  });

  it("rejects scraper request with empty query", () => {
    const result = validateBody(ScraperSchema, { query: "", platform: "aliexpress" });
    expect(result.success).toBe(false);
  });
});

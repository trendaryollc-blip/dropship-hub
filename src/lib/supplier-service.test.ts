import { describe, it, expect, vi, beforeEach } from "vitest";

describe("supplier-service", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CJ_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: true, data: { list: [] } }),
    }));
  });

  it("getSuppliers is a function", async () => {
    const { getSuppliers } = await import("./supplier-service");
    expect(typeof getSuppliers).toBe("function");
  });

  it("getSupplierById is a function", async () => {
    const { getSupplierById } = await import("./supplier-service");
    expect(typeof getSupplierById).toBe("function");
  });

  it("searchSuppliers is a function", async () => {
    const { searchSuppliers } = await import("./supplier-service");
    expect(typeof searchSuppliers).toBe("function");
  });

  it("getSuppliers returns array with CJ supplier", async () => {
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    expect(Array.isArray(suppliers)).toBe(true);
    expect(suppliers.length).toBeGreaterThan(0);
    expect(suppliers[0].id).toBe("cj-dropshipping");
    expect(suppliers[0].name).toBe("CJ Dropshipping");
  });

  it("getSuppliers only returns live data suppliers", async () => {
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    suppliers.forEach((s) => {
      expect(s.dataSource).toBe("live");
    });
  });

  it("getSuppliers does not return sample data suppliers", async () => {
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    const sampleSuppliers = suppliers.filter((s) => s.dataSource === "sample");
    expect(sampleSuppliers).toHaveLength(0);
  });

  it("getSupplierById returns null for unknown ID", async () => {
    const { getSupplierById } = await import("./supplier-service");
    const result = await getSupplierById("nonexistent");
    expect(result).toBeNull();
  });

  it("getSupplierById returns CJ supplier by id", async () => {
    const { getSupplierById } = await import("./supplier-service");
    const result = await getSupplierById("cj-dropshipping");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("cj-dropshipping");
    expect(result?.name).toBe("CJ Dropshipping");
  });

  it("getSupplierById returns CJ supplier by slug", async () => {
    const { getSupplierById } = await import("./supplier-service");
    const result = await getSupplierById("cj-dropshipping");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("cj-dropshipping");
  });

  it("searchSuppliers returns array", async () => {
    const { searchSuppliers } = await import("./supplier-service");
    const results = await searchSuppliers("cj");
    expect(Array.isArray(results)).toBe(true);
  });

  it("searchSuppliers filters by name", async () => {
    const { searchSuppliers } = await import("./supplier-service");
    const results = await searchSuppliers("CJ");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name.toLowerCase()).toContain("cj");
  });

  it("searchSuppliers filters by specialization", async () => {
    const { searchSuppliers } = await import("./supplier-service");
    const results = await searchSuppliers("Electronics");
    expect(Array.isArray(results)).toBe(true);
  });

  it("searchSuppliers filters by location", async () => {
    const { searchSuppliers } = await import("./supplier-service");
    const results = await searchSuppliers("China");
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0].location.toLowerCase()).toContain("china");
    }
  });

  it("searchSuppliers returns empty for unmatched query", async () => {
    const { searchSuppliers } = await import("./supplier-service");
    const results = await searchSuppliers("xyznonexistent123");
    expect(results).toHaveLength(0);
  });

  it("searchSuppliers with empty query returns all suppliers", async () => {
    const { searchSuppliers, getSuppliers } = await import("./supplier-service");
    const all = await getSuppliers();
    const results = await searchSuppliers("");
    expect(results.length).toBe(all.length);
  });

  it("getSuppliers caches results", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: true, data: { list: [] } }),
    });
    vi.stubGlobal("fetch", mockFetch);
    const { getSuppliers } = await import("./supplier-service");
    await getSuppliers();
    await getSuppliers();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("getSuppliers calls fetch", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: true, data: { list: [] } }),
    });
    vi.stubGlobal("fetch", mockFetch);
    const { getSuppliers } = await import("./supplier-service");
    await getSuppliers();
    expect(mockFetch).toHaveBeenCalled();
  });

  it("getSuppliers handles API error gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "API error" }),
    }));
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    expect(Array.isArray(suppliers)).toBe(true);
  });

  it("getSupplierById handles API error gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Not found" }),
    }));
    const { getSupplierById } = await import("./supplier-service");
    const result = await getSupplierById("some-id");
    expect(result).toBeNull();
  });

  it("searchSuppliers handles API error gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Search failed" }),
    }));
    const { searchSuppliers } = await import("./supplier-service");
    const results = await searchSuppliers("query");
    expect(Array.isArray(results)).toBe(true);
  });

  it("getSuppliers handles network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    expect(Array.isArray(suppliers)).toBe(true);
  });

  it("CJ supplier has correct structure", async () => {
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    const cj = suppliers[0];
    expect(cj).toHaveProperty("id");
    expect(cj).toHaveProperty("name");
    expect(cj).toHaveProperty("slug");
    expect(cj).toHaveProperty("location");
    expect(cj).toHaveProperty("country");
    expect(cj).toHaveProperty("flag");
    expect(cj).toHaveProperty("description");
    expect(cj).toHaveProperty("specializations");
    expect(cj).toHaveProperty("trustBadge");
    expect(cj).toHaveProperty("dataSource");
    expect(cj).toHaveProperty("stats");
    expect(cj).toHaveProperty("shipping");
    expect(cj).toHaveProperty("quality");
    expect(cj).toHaveProperty("catalog");
    expect(cj).toHaveProperty("communication");
    expect(cj).toHaveProperty("source");
    expect(cj).toHaveProperty("sourceUrl");
    expect(cj).toHaveProperty("lastUpdated");
  });

  it("CJ supplier has valid trust badge", async () => {
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    const cj = suppliers[0];
    expect(["gold", "silver", "bronze"]).toContain(cj.trustBadge);
  });

  it("CJ supplier has valid source", async () => {
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    const cj = suppliers[0];
    expect(cj.source).toBe("cj");
  });

  it("CJ supplier has shipping methods", async () => {
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    const cj = suppliers[0];
    expect(Array.isArray(cj.shipping.methods)).toBe(true);
    expect(cj.shipping.methods.length).toBeGreaterThan(0);
  });

  it("CJ supplier has communication methods", async () => {
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    const cj = suppliers[0];
    expect(Array.isArray(cj.communication.methods)).toBe(true);
    expect(cj.communication.methods.length).toBeGreaterThan(0);
  });

  it("CJ supplier has stats object with all required fields", async () => {
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    const stats = suppliers[0].stats;
    expect(stats).toHaveProperty("reliabilityScore");
    expect(stats).toHaveProperty("rating");
    expect(stats).toHaveProperty("reviews");
    expect(stats).toHaveProperty("responseTime");
    expect(stats).toHaveProperty("responseTimeHours");
    expect(stats).toHaveProperty("shippingDays");
    expect(stats).toHaveProperty("orderCompletionRate");
    expect(stats).toHaveProperty("disputeRate");
    expect(stats).toHaveProperty("monthlyOrders");
    expect(stats).toHaveProperty("totalProducts");
    expect(stats).toHaveProperty("yearEstablished");
    expect(stats).toHaveProperty("communicationScore");
    expect(stats).toHaveProperty("qualityScore");
    expect(stats).toHaveProperty("priceCompetitiveness");
  });
});

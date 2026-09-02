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

  it("getSuppliers returns array", async () => {
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    expect(Array.isArray(suppliers)).toBe(true);
    expect(suppliers.length).toBeGreaterThan(0);
  });

  it("getSupplierById returns null for unknown ID", async () => {
    const { getSupplierById } = await import("./supplier-service");
    const result = await getSupplierById("nonexistent");
    expect(result).toBeNull();
  });

  it("searchSuppliers returns array", async () => {
    const { searchSuppliers } = await import("./supplier-service");
    const results = await searchSuppliers("cj");
    expect(Array.isArray(results)).toBe(true);
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

  it("searchSuppliers calls fetch with query", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: true, data: { list: [] } }),
    });
    vi.stubGlobal("fetch", mockFetch);
    const { searchSuppliers } = await import("./supplier-service");
    await searchSuppliers("electronics");
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

  it("getSuppliers handles empty list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: true, data: { list: [] } }),
    }));
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    expect(Array.isArray(suppliers)).toBe(true);
  });

  it("searchSuppliers with empty query", async () => {
    const { searchSuppliers } = await import("./supplier-service");
    const results = await searchSuppliers("");
    expect(Array.isArray(results)).toBe(true);
  });

  it("getSuppliers handles network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));
    const { getSuppliers } = await import("./supplier-service");
    const suppliers = await getSuppliers();
    expect(Array.isArray(suppliers)).toBe(true);
  });
});

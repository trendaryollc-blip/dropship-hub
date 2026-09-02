import { describe, it, expect, vi, beforeEach } from "vitest";

describe("cj-auth", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CJ_API_KEY = "test-cj-key";
    vi.stubGlobal("fetch", vi.fn());
  });

  it("getCJAccessToken is a function", async () => {
    const { getCJAccessToken } = await import("./cj-auth");
    expect(typeof getCJAccessToken).toBe("function");
  });

  it("returns MCP key as-is when starts with MCP@", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const { getCJAccessToken } = await import("./cj-auth");
    const token = await getCJAccessToken("MCP@my-token");
    expect(token).toBe("MCP@my-token");
  });

  it("fetches token from API when not MCP@", async () => {
    const mockResponse = {
      result: true,
      data: {
        accessToken: "cj-access-token-123",
        accessTokenExpirationDate: new Date(Date.now() + 3600000).toISOString(),
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));
    const { getCJAccessToken } = await import("./cj-auth");
    const token = await getCJAccessToken("real-api-key");
    expect(token).toBe("cj-access-token-123");
  });

  it("returns MCP token without calling fetch", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    const { getCJAccessToken } = await import("./cj-auth");
    await getCJAccessToken("MCP@skip-api");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls fetch with correct URL for non-MCP key", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: true,
        data: {
          accessToken: "token",
          accessTokenExpirationDate: new Date(Date.now() + 3600000).toISOString(),
        },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);
    const { getCJAccessToken } = await import("./cj-auth");
    await getCJAccessToken("api-key-123");
    expect(mockFetch).toHaveBeenCalled();
  });

  it("throws when API returns error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: false, message: "Invalid key" }),
    }));
    const { getCJAccessToken } = await import("./cj-auth");
    await expect(getCJAccessToken("bad-key")).rejects.toThrow();
  });

  it("throws when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const { getCJAccessToken } = await import("./cj-auth");
    await expect(getCJAccessToken("api-key")).rejects.toThrow("Network error");
  });

  it("throws when response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    }));
    const { getCJAccessToken } = await import("./cj-auth");
    await expect(getCJAccessToken("api-key")).rejects.toThrow();
  });

  it("handles expired token in cache", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: true,
        data: {
          accessToken: "fresh-token",
          accessTokenExpirationDate: new Date(Date.now() + 3600000).toISOString(),
        },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);
    const { getCJAccessToken } = await import("./cj-auth");
    const token1 = await getCJAccessToken("api-key");
    expect(token1).toBe("fresh-token");
    const token2 = await getCJAccessToken("api-key");
    expect(token2).toBeDefined();
  });
});

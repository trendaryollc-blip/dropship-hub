import { describe, it, expect, vi, beforeEach } from "vitest";
import { safeFetch, FetchError } from "./safe-fetch";

describe("safeFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"name":"test"}'),
      })
    );

    const result = await safeFetch("https://api.example.com/data");
    expect(result).toEqual({ name: "test" });
  });

  it("returns null for empty response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(""),
      })
    );

    const result = await safeFetch("https://api.example.com/empty");
    expect(result).toBeNull();
  });

  it("throws FetchError for non-ok response with JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({ error: "Invalid input" }),
      })
    );

    await expect(safeFetch("https://api.example.com/bad")).rejects.toThrow(FetchError);
    try {
      await safeFetch("https://api.example.com/bad");
    } catch (e) {
      expect((e as FetchError).message).toBe("Invalid input");
      expect((e as FetchError).status).toBe(400);
    }
  });

  it("throws FetchError for non-ok response with message field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: "Unprocessable",
        json: () => Promise.resolve({ message: "Validation failed" }),
      })
    );

    try {
      await safeFetch("https://api.example.com/validate");
    } catch (e) {
      expect((e as FetchError).message).toBe("Validation failed");
      expect((e as FetchError).status).toBe(422);
    }
  });

  it("throws FetchError for non-ok response with text body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("not json")),
        text: () => Promise.resolve("Server error occurred"),
      })
    );

    try {
      await safeFetch("https://api.example.com/error");
    } catch (e) {
      expect(e).toBeInstanceOf(FetchError);
      expect((e as FetchError).status).toBe(500);
      expect((e as FetchError).message).toContain("HTTP 500");
    }
  });

  it("throws FetchError for invalid JSON response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("not valid json"),
      })
    );

    try {
      await safeFetch("https://api.example.com/bad-json");
    } catch (e) {
      expect(e).toBeInstanceOf(FetchError);
      expect((e as FetchError).message).toContain("not valid JSON");
    }
  });

  it("FetchError has correct name", () => {
    const err = new FetchError("test", 400, "Bad Request");
    expect(err.name).toBe("FetchError");
    expect(err.status).toBe(400);
    expect(err.statusText).toBe("Bad Request");
  });

  it("passes init options to fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", fetchMock);

    await safeFetch("https://api.example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("handles non-object error body gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: () => Promise.resolve("just a string error"),
        text: () => Promise.resolve("Bad Gateway"),
      })
    );

    try {
      await safeFetch("https://api.example.com/gateway");
    } catch (e) {
      expect((e as FetchError).status).toBe(502);
    }
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSearchStream } from "./useSearchStream";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockReadableStream(events: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      }
      controller.close();
    },
  });
}

describe("useSearchStream", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("initializes with empty state", () => {
    const { result } = renderHook(() => useSearchStream());
    expect(result.current.results).toEqual([]);
    expect(result.current.completedPlatforms).toEqual([]);
    expect(result.current.loadingPlatforms).toEqual([]);
    expect(result.current.errorPlatforms).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.totalExpected).toBe(0);
    expect(result.current.totalResults).toBe(0);
  });

  it("sets isStreaming to true on startStream", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({ results: [], platforms: {} }),
    });

    const { result } = renderHook(() => useSearchStream());

    act(() => {
      result.current.startStream("test query");
    });

    expect(result.current.isStreaming).toBe(true);
  });

  it("handles non-streaming fallback response", async () => {
    const mockResults = [
      { title: "Product A", price: 10, image: null, link: "https://example.com/1", source: "amazon" },
      { title: "Product B", price: 20, image: null, link: "https://example.com/2", source: "ebay" },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({ results: mockResults, platforms: { amazon: 1, ebay: 1 } }),
    });

    const { result } = renderHook(() => useSearchStream());

    await act(async () => {
      result.current.startStream("test query");
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.results).toHaveLength(2);
    expect(result.current.completedPlatforms).toContain("amazon");
    expect(result.current.completedPlatforms).toContain("ebay");
    expect(result.current.isStreaming).toBe(false);
  });

  it("deduplicates results by source+title+price", async () => {
    const mockResults = [
      { title: "Product A", price: 10, image: null, link: "https://example.com/1", source: "amazon" },
      { title: "Product A", price: 10, image: null, link: "https://example.com/2", source: "amazon" },
      { title: "Product B", price: 20, image: null, link: "https://example.com/3", source: "ebay" },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({ results: mockResults, platforms: { amazon: 1, ebay: 1 } }),
    });

    const { result } = renderHook(() => useSearchStream());

    await act(async () => {
      result.current.startStream("test query");
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.results).toHaveLength(2);
  });

  it("sets loadingPlatforms for default platforms", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({ results: [], platforms: {} }),
    });

    const { result } = renderHook(() => useSearchStream());

    act(() => {
      result.current.startStream("test query");
    });

    expect(result.current.loadingPlatforms.length).toBeGreaterThan(0);
    expect(result.current.totalExpected).toBeGreaterThan(0);
  });

  it("respects custom platforms parameter", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({ results: [], platforms: {} }),
    });

    const { result } = renderHook(() => useSearchStream());

    act(() => {
      result.current.startStream("test query", ["amazon", "ebay"]);
    });

    expect(result.current.totalExpected).toBe(2);
  });

  it("abort() stops the stream", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useSearchStream());

    act(() => {
      result.current.startStream("test query");
    });

    expect(result.current.isStreaming).toBe(true);

    act(() => {
      result.current.abort();
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it("reset() clears all state", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({ results: [{ title: "A", price: 1, image: null, link: "", source: "amazon" }], platforms: { amazon: 1 } }),
    });

    const { result } = renderHook(() => useSearchStream());

    await act(async () => {
      result.current.startStream("test");
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.results.length).toBeGreaterThan(0);

    act(() => {
      result.current.reset();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.completedPlatforms).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
  });

  it("handles connection failure gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSearchStream());

    await act(async () => {
      result.current.startStream("test query");
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it("handles non-ok HTTP response with fallback", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Map(),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Map([["content-type", "application/json"]]),
        json: async () => ({ results: [{ title: "Fallback", price: 5, image: null, link: "", source: "amazon" }], platforms: { amazon: 1 } }),
      });

    const { result } = renderHook(() => useSearchStream());

    await act(async () => {
      result.current.startStream("test query");
      await new Promise((r) => setTimeout(r, 200));
    });

    expect(result.current.results).toHaveLength(1);
  });

  it("cleans up on unmount", () => {
    const { result, unmount } = renderHook(() => useSearchStream());

    act(() => {
      result.current.startStream("test");
    });

    unmount();
  });

  describe("SSE streaming events", () => {
    it("handles platform:start events", async () => {
      const events = [
        JSON.stringify({ type: "init", platforms: [{ id: "amazon", name: "Amazon" }], total: 1 }),
        JSON.stringify({ type: "platform:start", platform: "amazon" }),
        JSON.stringify({ type: "done", results: [] }),
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/event-stream"]]),
        body: createMockReadableStream(events),
      });

      const { result } = renderHook(() => useSearchStream());

      await act(async () => {
        result.current.startStream("test query");
        await new Promise((r) => setTimeout(r, 200));
      });

      expect(result.current.loadingPlatforms).toContain("amazon");
    });

    it("handles platform:result events with new results", async () => {
      const results = [
        { title: "Product A", price: 10, image: null, link: "https://example.com/1", source: "amazon" },
      ];

      const events = [
        JSON.stringify({ type: "init", platforms: [{ id: "amazon", name: "Amazon" }], total: 1 }),
        JSON.stringify({ type: "platform:start", platform: "amazon" }),
        JSON.stringify({ type: "platform:result", platform: "amazon", results, count: 1 }),
        JSON.stringify({ type: "done", results: [] }),
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/event-stream"]]),
        body: createMockReadableStream(events),
      });

      const { result } = renderHook(() => useSearchStream());

      await act(async () => {
        result.current.startStream("test query");
        await new Promise((r) => setTimeout(r, 200));
      });

      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0].title).toBe("Product A");
      expect(result.current.completedPlatforms).toContain("amazon");
    });

    it("handles platform:error events", async () => {
      const events = [
        JSON.stringify({ type: "init", platforms: [{ id: "amazon", name: "Amazon" }], total: 1 }),
        JSON.stringify({ type: "platform:start", platform: "amazon" }),
        JSON.stringify({ type: "platform:error", platform: "amazon", error: "API rate limited" }),
        JSON.stringify({ type: "done", results: [] }),
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/event-stream"]]),
        body: createMockReadableStream(events),
      });

      const { result } = renderHook(() => useSearchStream());

      await act(async () => {
        result.current.startStream("test query");
        await new Promise((r) => setTimeout(r, 200));
      });

      expect(result.current.errorPlatforms).toHaveLength(1);
      expect(result.current.errorPlatforms[0].error).toBe("API rate limited");
    });

    it("handles done event and stops streaming", async () => {
      const events = [
        JSON.stringify({ type: "init", platforms: [], total: 0 }),
        JSON.stringify({ type: "done", results: [] }),
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/event-stream"]]),
        body: createMockReadableStream(events),
      });

      const { result } = renderHook(() => useSearchStream());

      await act(async () => {
        result.current.startStream("test query");
        await new Promise((r) => setTimeout(r, 200));
      });

      expect(result.current.isStreaming).toBe(false);
    });

    it("deduplicates results across streaming events", async () => {
      const events = [
        JSON.stringify({ type: "init", platforms: [{ id: "amazon", name: "Amazon" }, { id: "ebay", name: "eBay" }], total: 2 }),
        JSON.stringify({ type: "platform:start", platform: "amazon" }),
        JSON.stringify({
          type: "platform:result",
          platform: "amazon",
          results: [{ title: "Product A", price: 10, image: null, link: "https://example.com/1", source: "amazon" }],
          count: 1,
        }),
        JSON.stringify({ type: "platform:start", platform: "ebay" }),
        JSON.stringify({
          type: "platform:result",
          platform: "ebay",
          results: [{ title: "Product A", price: 10, image: null, link: "https://example.com/2", source: "amazon" }],
          count: 1,
        }),
        JSON.stringify({ type: "done", results: [] }),
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/event-stream"]]),
        body: createMockReadableStream(events),
      });

      const { result } = renderHook(() => useSearchStream());

      await act(async () => {
        result.current.startStream("test query");
        await new Promise((r) => setTimeout(r, 200));
      });

      // Should deduplicate the same product from different events
      expect(result.current.results).toHaveLength(1);
    });

    it("handles malformed JSON events gracefully", async () => {
      const events = [
        JSON.stringify({ type: "init", platforms: [{ id: "amazon", name: "Amazon" }], total: 1 }),
        "data: { malformed json",
        JSON.stringify({ type: "done", results: [] }),
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([["content-type", "text/event-stream"]]),
        body: createMockReadableStream(events),
      });

      const { result } = renderHook(() => useSearchStream());

      await act(async () => {
        result.current.startStream("test query");
        await new Promise((r) => setTimeout(r, 200));
      });

      expect(result.current.isStreaming).toBe(false);
    });
  });
});

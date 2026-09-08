import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  SearchTrackingProvider,
  useSearchTracking,
  type SearchTrackingContextValue,
} from "./SearchTrackingContext";
import { createElement, type ReactNode } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────

function TestConsumer({ onReady }: { onReady: (ctx: SearchTrackingContextValue) => void }) {
  const ctx = useSearchTracking();
  onReady(ctx);
  return createElement("div", null, "tracking consumer");
}

function renderProvider(
  children: ReactNode,
  options: { userId?: string; trackFn?: SearchTrackingProviderProps["trackFn"] } = {}
) {
  return render(
    createElement(SearchTrackingProvider, {
      userId: options.userId || "test-user",
      trackFn: options.trackFn,
      children,
    })
  );
}

// Need this type for the options
interface SearchTrackingProviderProps {
  userId?: string;
  trackFn?: (event: string, data: Record<string, unknown>) => Promise<void>;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("SearchTrackingProvider", () => {
  let trackFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    trackFn = vi.fn(async () => {});
  });

  it("renders children", () => {
    renderProvider(createElement("div", null, "child content"), { trackFn });
    expect(screen.getByText("child content")).toBeTruthy();
  });

  it("provides context value", () => {
    let contextValue: SearchTrackingContextValue | null = null;
    renderProvider(
      createElement(TestConsumer, {
        onReady: (ctx) => { contextValue = ctx; },
      }),
      { trackFn }
    );
    expect(contextValue).not.toBeNull();
    expect(typeof contextValue!.trackSearch).toBe("function");
    expect(typeof contextValue!.trackClick).toBe("function");
    expect(typeof contextValue!.trackSave).toBe("function");
    expect(typeof contextValue!.trackView).toBe("function");
    expect(typeof contextValue!.trackCompare).toBe("function");
    expect(typeof contextValue!.getPersonalizationProfile).toBe("function");
  });

  it("trackSearch calls trackFn", async () => {
    let contextValue: SearchTrackingContextValue | null = null;
    renderProvider(
      createElement(TestConsumer, {
        onReady: (ctx) => { contextValue = ctx; },
      }),
      { trackFn }
    );

    await act(async () => {
      contextValue!.trackSearch("wireless earbuds", 10);
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(trackFn).toHaveBeenCalledWith(
      "batch",
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({
            type: "search",
            data: expect.objectContaining({
              query: "wireless earbuds",
              resultCount: 10,
              userId: "test-user",
            }),
          }),
        ]),
      })
    );
  });

  it("trackClick calls trackFn", async () => {
    let contextValue: SearchTrackingContextValue | null = null;
    renderProvider(
      createElement(TestConsumer, {
        onReady: (ctx) => { contextValue = ctx; },
      }),
      { trackFn }
    );

    await act(async () => {
      contextValue!.trackClick("prod-1", "earbuds", "amazon");
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(trackFn).toHaveBeenCalledWith(
      "batch",
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({
            type: "click",
            data: expect.objectContaining({
              productId: "prod-1",
              query: "earbuds",
              platform: "amazon",
            }),
          }),
        ]),
      })
    );
  });

  it("trackSave calls trackFn", async () => {
    let contextValue: SearchTrackingContextValue | null = null;
    renderProvider(
      createElement(TestConsumer, {
        onReady: (ctx) => { contextValue = ctx; },
      }),
      { trackFn }
    );

    await act(async () => {
      contextValue!.trackSave("prod-1", "earbuds");
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(trackFn).toHaveBeenCalledWith(
      "batch",
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({
            type: "save",
            data: expect.objectContaining({ productId: "prod-1", query: "earbuds" }),
          }),
        ]),
      })
    );
  });

  it("trackView calls trackFn", async () => {
    let contextValue: SearchTrackingContextValue | null = null;
    renderProvider(
      createElement(TestConsumer, {
        onReady: (ctx) => { contextValue = ctx; },
      }),
      { trackFn }
    );

    await act(async () => {
      contextValue!.trackView("prod-1", "earbuds", 5000);
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(trackFn).toHaveBeenCalledWith(
      "batch",
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({
            type: "view",
            data: expect.objectContaining({ productId: "prod-1", durationMs: 5000 }),
          }),
        ]),
      })
    );
  });

  it("trackCompare calls trackFn", async () => {
    let contextValue: SearchTrackingContextValue | null = null;
    renderProvider(
      createElement(TestConsumer, {
        onReady: (ctx) => { contextValue = ctx; },
      }),
      { trackFn }
    );

    await act(async () => {
      contextValue!.trackCompare(["p1", "p2"], "earbuds");
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(trackFn).toHaveBeenCalledWith(
      "batch",
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({
            type: "compare",
            data: expect.objectContaining({ productIds: ["p1", "p2"], query: "earbuds" }),
          }),
        ]),
      })
    );
  });

  it("handles unauthenticated state (no userId)", async () => {
    const freshTrackFn = vi.fn(async () => {});
    let contextValue: SearchTrackingContextValue | null = null;

    render(
      createElement(SearchTrackingProvider, {
        userId: undefined,
        trackFn: freshTrackFn,
        children: createElement(TestConsumer, {
          onReady: (ctx) => { contextValue = ctx; },
        }),
      })
    );

    await act(async () => {
      contextValue!.trackSearch("test", 1);
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(freshTrackFn).not.toHaveBeenCalled();
  });

  it("debounces rapid tracking calls", async () => {
    const debounceTrackFn = vi.fn(async () => {});
    let contextValue: SearchTrackingContextValue | null = null;

    render(
      createElement(SearchTrackingProvider, {
        userId: "test-user",
        trackFn: debounceTrackFn,
        children: createElement(TestConsumer, {
          onReady: (ctx) => { contextValue = ctx; },
        }),
      })
    );

    await act(async () => {
      contextValue!.trackSearch("query1", 1);
      contextValue!.trackSearch("query2", 2);
      contextValue!.trackSearch("query3", 3);
      await new Promise((r) => setTimeout(r, 600));
    });

    // debounce should batch into a single call (only the last one fires)
    expect(debounceTrackFn.mock.calls.length).toBe(1);
    const events = debounceTrackFn.mock.calls[0][1].events;
    expect(events).toHaveLength(3);
    expect(events[2].data.query).toBe("query3");
  });

  it("handles trackFn failure gracefully", async () => {
    const failingFn = vi.fn(async () => { throw new Error("fail"); });
    let contextValue: SearchTrackingContextValue | null = null;

    renderProvider(
      createElement(TestConsumer, {
        onReady: (ctx) => { contextValue = ctx; },
      }),
      { trackFn: failingFn }
    );

    await act(async () => {
      contextValue!.trackSearch("test", 1);
      await new Promise((r) => setTimeout(r, 600));
    });

    // should not throw
    expect(failingFn).toHaveBeenCalled();
  });

  it("getPersonalizationProfile returns profile from getProfileFn", async () => {
    const customProfile = {
      preferredCategories: ["electronics"],
      preferredPlatforms: ["amazon"],
      priceRange: { min: 10, max: 100 },
      avgRating: 4.5,
      lastUpdated: "2026-01-01T00:00:00Z",
    };
    const getProfileFn = vi.fn(async () => customProfile);

    let contextValue: SearchTrackingContextValue | null = null;

    render(
      createElement(SearchTrackingProvider, {
        userId: "test-user",
        trackFn: vi.fn(async () => {}),
        getProfileFn,
        children: createElement(TestConsumer, {
          onReady: (ctx) => { contextValue = ctx; },
        }),
      })
    );

    const profile = await contextValue!.getPersonalizationProfile();
    expect(profile).toEqual(customProfile);
    expect(getProfileFn).toHaveBeenCalled();
  });
});

// ── useSearchTracking ─────────────────────────────────────────────────────

describe("useSearchTracking", () => {
  it("throws when used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function BadConsumer() {
      useSearchTracking();
      return null;
    }

    expect(() => {
      render(createElement(BadConsumer));
    }).toThrow("useSearchTracking must be used within SearchTrackingProvider");

    consoleSpy.mockRestore();
  });
});

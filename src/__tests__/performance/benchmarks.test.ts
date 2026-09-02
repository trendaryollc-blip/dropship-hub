import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          add: vi.fn().mockResolvedValue({ id: "id" }),
          get: vi.fn().mockResolvedValue({ docs: [] }),
        }),
        get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
        set: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

describe("Performance Tests - Calculation Benchmarks", () => {
  it("bulk profit calculations complete within 500ms", async () => {
    const { calculateProfit, calculateMargin } = await import("@/lib/calculations");
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      calculateProfit(10 + i, 5 + i * 0.5, 0.1, 2, 0.5);
      calculateMargin(10 + i, 5 + i * 0.5);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it("bulk ROI calculations complete within 500ms", async () => {
    const { calculateAdROI } = await import("@/lib/calculations");
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      calculateAdROI(500 + i * 10, 200 + i * 5, 10, 15, 0.02, 0.05, 50);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

describe("Performance Tests - Rate Limiter Benchmarks", () => {
  it("rate limiter handles 1000 checks within 100ms", async () => {
    const { rateLimitByUser } = await import("@/lib/rate-limit");
    const config = { windowMs: 60000, maxRequests: 100 };
    const mockReq = { nextUrl: { pathname: "/api/test" } } as never;
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      rateLimitByUser(mockReq, `perf-user-${i % 10}`, config);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});

describe("Performance Tests - Catalog Benchmarks", () => {
  it("platform catalog lookups complete within 50ms", async () => {
    const { PLATFORM_CATALOG } = await import("@/lib/platform-catalog");
    const ids = Object.keys(PLATFORM_CATALOG);
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      for (const id of ids) {
        void PLATFORM_CATALOG[id as keyof typeof PLATFORM_CATALOG];
      }
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it("store catalog lookups complete within 50ms", async () => {
    const { STORE_CATALOG } = await import("@/lib/store-catalog");
    const ids = Object.keys(STORE_CATALOG);
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      for (const id of ids) {
        void STORE_CATALOG[id as keyof typeof STORE_CATALOG];
      }
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

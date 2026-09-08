import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MonitoredProduct } from "./types";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./retry", () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock("./notification-dispatcher", () => ({
  dispatchNotifications: vi.fn().mockResolvedValue({ dispatched: 1, skipped: 0 }),
}));

vi.mock("./delister", () => ({
  autoDelistProduct: vi.fn().mockResolvedValue(true),
}));

vi.mock("./price-history", () => ({
  appendPriceSnapshot: vi.fn().mockResolvedValue(undefined),
}));

import { runPriceCheckForUser, runPriceCheckForProduct } from "./scheduler";
import { getAdminDB } from "@/lib/firebase-admin";
import { dispatchNotifications } from "./notification-dispatcher";
import { autoDelistProduct } from "./delister";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createMockProduct(overrides: Partial<MonitoredProduct> = {}): MonitoredProduct {
  return {
    productId: "p1",
    productTitle: "Test Product",
    source: "amazon",
    sourceUrl: "https://amazon.com/dp/123",
    currentPrice: 29.99,
    lowestPrice: 25.99,
    highestPrice: 34.99,
    lastChecked: new Date().toISOString(),
    priceHistory: [],
    stockStatus: "in_stock",
    alerts: [],
    ...overrides,
  };
}

function createMockDb(products: MonitoredProduct[]) {
  const mockDocs = products.map((p, i) => {
    const refUpdate = vi.fn().mockResolvedValue(undefined);
    const refGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => p,
    });
    const docObj = {
      id: `doc-${i}`,
      data: () => p,
      ref: { id: `doc-${i}`, update: refUpdate, get: refGet },
    };
    return docObj;
  });

  const mockBatch = {
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  const monitoredCollectionGet = vi.fn().mockResolvedValue({
    empty: products.length === 0,
    docs: mockDocs,
  });

  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          get: monitoredCollectionGet,
        }),
        get: vi.fn().mockResolvedValue({
          exists: products.length > 0,
          data: () => products[0] || null,
        }),
      }),
    }),
    batch: vi.fn().mockReturnValue(mockBatch),
    _mockDocs: mockDocs,
  };
}

describe("runPriceCheckForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    process.env.SCRAPER_API_KEY = "test-scraper-key";
  });

  it("returns zero counts for empty products", async () => {
    const mockDb = createMockDb([]);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await runPriceCheckForUser("uid-1");
    expect(result.checked).toBe(0);
    expect(result.priceChanged).toBe(0);
    expect(result.stockChanged).toBe(0);
    expect(result.alerts).toBe(0);
    expect(result.errors).toBe(0);
  });

  it("skips products without sourceUrl", async () => {
    const products = [createMockProduct({ sourceUrl: "" })];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await runPriceCheckForUser("uid-1");
    expect(result.checked).toBe(1);
    expect(result.priceChanged).toBe(0);
  });

  it("processes products with sourceUrl", async () => {
    const products = [createMockProduct({ sourceUrl: "https://example.com/product" })];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("$25.99"),
    });

    const result = await runPriceCheckForUser("uid-1");
    expect(result.checked).toBe(1);
  });

  it("dispatches notifications when alerts are generated", async () => {
    const products = [
      createMockProduct({
        currentPrice: 50,
        priceDropThreshold: 5,
        sourceUrl: "https://example.com/product",
      }),
    ];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("$40.00"),
    });

    await runPriceCheckForUser("uid-1");
    expect(dispatchNotifications).toHaveBeenCalled();
  });

  it("handles errors gracefully", async () => {
    (getAdminDB as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const result = await runPriceCheckForUser("uid-1");
    expect(result.errors).toBe(1);
    expect(result.checked).toBe(0);
  });

  it("triggers auto-delist when product goes out of stock", async () => {
    const products = [
      createMockProduct({
        stockStatus: "in_stock",
        autoDelist: true,
        sourceUrl: "https://example.com/product",
      }),
    ];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("This product is out of stock and unavailable"),
    });

    await runPriceCheckForUser("uid-1");
    expect(autoDelistProduct).toHaveBeenCalled();
  });
});

describe("runPriceCheckForProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    process.env.SCRAPER_API_KEY = "test-scraper-key";
  });

  it("returns no changes for non-existent product", async () => {
    const mockDb = createMockDb([]);
    const docGet = mockDb.collection().doc().get;
    docGet.mockResolvedValue({ exists: false });
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await runPriceCheckForProduct("uid-1", "nonexistent");
    expect(result.priceChanged).toBe(false);
    expect(result.stockChanged).toBe(false);
    expect(result.newAlerts).toBe(0);
  });

  it("returns no changes for product without sourceUrl", async () => {
    const product = createMockProduct({ sourceUrl: "" });
    const mockDb = createMockDb([product]);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await runPriceCheckForProduct("uid-1", "doc-0");
    expect(result.priceChanged).toBe(false);
  });

  it("processes product with sourceUrl", async () => {
    const product = createMockProduct({ sourceUrl: "https://example.com/product" });
    const mockDb = createMockDb([product]);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("$25.00"),
    });

    const result = await runPriceCheckForProduct("uid-1", "doc-0");
    expect(typeof result.priceChanged).toBe("boolean");
    expect(typeof result.stockChanged).toBe("boolean");
    expect(typeof result.newAlerts).toBe("number");
  });

  it("returns no changes on error", async () => {
    (getAdminDB as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const result = await runPriceCheckForProduct("uid-1", "doc-0");
    expect(result.priceChanged).toBe(false);
    expect(result.stockChanged).toBe(false);
  });
});

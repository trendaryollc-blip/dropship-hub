import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockRunTransaction = vi.fn();

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(async () => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: mockGet,
            set: mockSet,
          })),
        })),
      })),
    })),
    runTransaction: mockRunTransaction,
  })),
}));

import { recordProductPriceSnapshot, getProductPriceHistory } from "./price-tracker";
import { productPriceKey, seriesForPlatform } from "./price-key";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("productPriceKey", () => {
  it("is stable for the same input", () => {
    expect(productPriceKey("Widget", "Gadgets")).toBe(productPriceKey("Widget", "Gadgets"));
  });

  it("differs for different titles", () => {
    expect(productPriceKey("Widget A")).not.toBe(productPriceKey("Widget B"));
  });
});

describe("seriesForPlatform", () => {
  it("extracts a platform series in order", () => {
    const history = [
      { date: "2026-01-01", prices: { amazon: 10, ebay: 12 } },
      { date: "2026-01-02", prices: { amazon: 11 } },
    ];
    expect(seriesForPlatform(history, "amazon")).toEqual([
      { date: "2026-01-01", price: 10 },
      { date: "2026-01-02", price: 11 },
    ]);
    expect(seriesForPlatform(history, "ebay")).toEqual([{ date: "2026-01-01", price: 12 }]);
  });
});

describe("recordProductPriceSnapshot", () => {
  it("skips invalid prices without touching Firestore", async () => {
    await recordProductPriceSnapshot("u1", "k1", "Widget", { amazon: 0, ebay: -5 });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("updates the same-day point instead of duplicating", async () => {
    const today = new Date().toISOString().split("T")[0];
    const existing = [{ date: today, prices: { amazon: 10 } }];
    mockRunTransaction.mockImplementation(async (fn: any) => {
      await fn({
        get: vi.fn(async () => ({ exists: true, data: () => ({ history: existing }) })),
        set: mockSet,
        update: vi.fn(),
      });
    });
    await recordProductPriceSnapshot("u1", "k1", "Widget", { amazon: 12 });
    expect(mockSet).toHaveBeenCalledTimes(1);
    const written = mockSet.mock.calls[0][1] as { key: string; title: string; history: { date: string; prices: Record<string, number> }[] };
    expect(written.key).toBe("k1");
    expect(written.title).toBe("Widget");
    expect(written.history).toHaveLength(1);
    expect(written.history[0].prices.amazon).toBe(12);
  });
});

describe("getProductPriceHistory", () => {
  it("returns [] when the doc is missing", async () => {
    mockGet.mockResolvedValue({ exists: false });
    expect(await getProductPriceHistory("u1", "missing")).toEqual([]);
  });
});

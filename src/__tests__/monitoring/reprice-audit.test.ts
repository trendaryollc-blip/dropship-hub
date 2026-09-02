import { describe, it, expect, vi, beforeEach } from "vitest";
import { logRepriceAction, getRepriceAuditLog, getRepriceStats } from "@/lib/monitoring/reprice-audit";

const mockGetAdminDB = vi.fn();

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: (...args: unknown[]) => mockGetAdminDB(...args),
}));

describe("reprice-audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logRepriceAction", () => {
    it("logs a reprice action to Firestore", async () => {
      const setFn = vi.fn().mockResolvedValue(undefined);
      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              doc: () => ({
                set: setFn,
                id: "audit-id-1",
              }),
            }),
          }),
        }),
      });

      const id = await logRepriceAction("user1", {
        productId: "prod1",
        productTitle: "Test Product",
        oldSellPrice: 50,
        newSellPrice: 55,
        supplierPrice: 25,
        ruleType: "maintain_margin",
        ruleValue: 50,
        storeUpdated: true,
        storePlatform: "shopify",
      });

      expect(id).toBeDefined();
      expect(setFn).toHaveBeenCalled();
    });

    it("returns empty string on failure", async () => {
      mockGetAdminDB.mockRejectedValue(new Error("Firestore error"));

      const id = await logRepriceAction("user1", {
        productId: "prod1",
        productTitle: "Test Product",
        oldSellPrice: 50,
        newSellPrice: 55,
        supplierPrice: 25,
        ruleType: "maintain_margin",
        ruleValue: 50,
        storeUpdated: false,
      });

      expect(id).toBe("");
    });
  });

  describe("getRepriceAuditLog", () => {
    it("returns audit entries", async () => {
      const entries = [
        { id: "1", productId: "prod1", oldSellPrice: 50, newSellPrice: 55, createdAt: "2026-01-01" },
        { id: "2", productId: "prod2", oldSellPrice: 30, newSellPrice: 35, createdAt: "2026-01-02" },
      ];

      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              orderBy: () => ({
                limit: () => ({
                  get: vi.fn().mockResolvedValue({
                    docs: entries.map((e) => ({ data: () => e })),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const log = await getRepriceAuditLog("user1");
      expect(log).toHaveLength(2);
      expect(log[0].productId).toBe("prod1");
    });

    it("returns empty array on failure", async () => {
      mockGetAdminDB.mockRejectedValue(new Error("Firestore error"));

      const log = await getRepriceAuditLog("user1");
      expect(log).toEqual([]);
    });
  });

  describe("getRepriceStats", () => {
    it("calculates reprice statistics", async () => {
      const entries = [
        { oldSellPrice: 50, newSellPrice: 55, error: undefined },
        { oldSellPrice: 30, newSellPrice: 35, error: undefined },
        { oldSellPrice: 40, newSellPrice: 0, error: "Store update failed" },
      ];

      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              orderBy: () => ({
                limit: () => ({
                  get: vi.fn().mockResolvedValue({
                    docs: entries.map((e) => ({ data: () => ({ ...e, createdAt: "2026-01-01T00:00:00Z" }) })),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const stats = await getRepriceStats("user1");
      expect(stats.totalReprices).toBe(3);
      expect(stats.successfulReprices).toBe(2);
      expect(stats.failedReprices).toBe(1);
      // (55-50)/50 + (35-30)/30 + (0-40)/40 = 10% + 16.67% + -100% = -73.33% / 3 = -24.44
      expect(stats.avgPriceChange).toBeCloseTo(-24.44, 0);
    });

    it("returns zero stats for empty log", async () => {
      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              orderBy: () => ({
                limit: () => ({
                  get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
                }),
              }),
            }),
          }),
        }),
      });

      const stats = await getRepriceStats("user1");
      expect(stats.totalReprices).toBe(0);
      expect(stats.lastRepriceTime).toBeNull();
    });
  });
});

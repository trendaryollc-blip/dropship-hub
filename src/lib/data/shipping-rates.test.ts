import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase-admin", () => {
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  const mockDelete = vi.fn();
  const mockDB = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: mockGet,
    set: mockSet,
    delete: mockDelete,
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  return {
    getAdminDB: vi.fn().mockResolvedValue(mockDB),
    __mocks: { mockGet, mockSet, mockDelete, mockDB },
  };
});

import {
  buildRateCacheKey,
  getCachedRates,
  setCachedRates,
  getShippingPreferences,
  saveShippingPreferences,
  getCustomsEstimateHistory,
  getRateComparisonHistory,
  getShippingAnalytics,
} from "@/lib/data/shipping-rates";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const firebaseAdmin = await import("@/lib/firebase-admin") as any;
const { mockGet, mockSet, mockDelete, mockDB } = firebaseAdmin.__mocks;

beforeEach(() => {
  vi.clearAllMocks();
  mockDB.collection.mockReturnThis();
  mockDB.doc.mockReturnThis();
  mockDB.where.mockReturnThis();
  mockDB.orderBy.mockReturnThis();
  mockDB.limit.mockReturnThis();
});

describe("Shipping Rates Data Layer", () => {
  describe("buildRateCacheKey", () => {
    it("builds cache key from parameters", () => {
      const key = buildRateCacheKey("CN", "US", 0.5, 15, 10, 5);
      expect(key).toBe("CN_US_0.50_15_10_5");
    });

    it("normalizes weight to 2 decimal places", () => {
      const key = buildRateCacheKey("CN", "US", 0.555, 15, 10, 5);
      expect(key).toContain("0.56");
    });

    it("produces consistent keys for same inputs", () => {
      const key1 = buildRateCacheKey("CN", "US", 0.5, 15, 10, 5);
      const key2 = buildRateCacheKey("CN", "US", 0.5, 15, 10, 5);
      expect(key1).toBe(key2);
    });
  });

  describe("getCachedRates", () => {
    it("returns cached rates when available", async () => {
      const mockData = {
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        rates: [{ carrierId: "cj", serviceLevel: "standard", cost: 5.99, estimatedDaysMin: 10, estimatedDaysMax: 18 }],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      mockGet.mockResolvedValue({ exists: true, data: () => mockData, id: "test-key" });

      const result = await getCachedRates("test-key");
      expect(result).toBeDefined();
      expect(result?.rates.length).toBe(1);
    });

    it("returns null for expired cache", async () => {
      const mockData = {
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        rates: [],
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        expiresAt: new Date(Date.now() - 3600000).toISOString(),
      };

      mockGet.mockResolvedValue({ exists: true, data: () => mockData, id: "test-key" });
      mockDelete.mockResolvedValue(undefined);

      const result = await getCachedRates("test-key");
      expect(result).toBeNull();
    });

    it("returns null for non-existent cache", async () => {
      mockGet.mockResolvedValue({ exists: false });

      const result = await getCachedRates("non-existent");
      expect(result).toBeNull();
    });

    it("handles errors gracefully", async () => {
      mockGet.mockRejectedValue(new Error("Firestore error"));

      const result = await getCachedRates("error-key");
      expect(result).toBeNull();
    });
  });

  describe("setCachedRates", () => {
    it("saves cache to Firestore", async () => {
      mockSet.mockResolvedValue(undefined);

      await setCachedRates({
        cacheKey: "test-key",
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        rates: [{ carrierId: "cj", serviceLevel: "standard", cost: 5.99, estimatedDaysMin: 10, estimatedDaysMax: 18 }],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      expect(mockSet).toHaveBeenCalled();
    });

    it("handles errors silently", async () => {
      mockSet.mockRejectedValue(new Error("Firestore error"));

      await expect(setCachedRates({
        cacheKey: "error-key",
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        rates: [],
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
      })).resolves.not.toThrow();
    });
  });

  describe("getShippingPreferences", () => {
    it("returns preferences when they exist", async () => {
      const mockPrefs = {
        userId: "user1",
        defaultOptimization: "balanced",
        defaultMaxBudget: 20,
        defaultMaxDeliveryDays: 15,
        preferredCarriers: ["cj"],
        excludedCarriers: [],
        requireTracking: true,
        requireInsurance: false,
        autoSelectEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGet.mockResolvedValue({ exists: true, data: () => mockPrefs });

      const result = await getShippingPreferences("user1");
      expect(result).toBeDefined();
      expect(result?.defaultOptimization).toBe("balanced");
    });

    it("returns null when no preferences exist", async () => {
      mockGet.mockResolvedValue({ exists: false });

      const result = await getShippingPreferences("user1");
      expect(result).toBeNull();
    });

    it("handles errors gracefully", async () => {
      mockGet.mockRejectedValue(new Error("Firestore error"));

      const result = await getShippingPreferences("user1");
      expect(result).toBeNull();
    });
  });

  describe("saveShippingPreferences", () => {
    it("saves preferences to Firestore", async () => {
      mockGet.mockResolvedValue({ exists: false });
      mockSet.mockResolvedValue(undefined);

      await saveShippingPreferences("user1", {
        defaultOptimization: "cost",
        defaultMaxBudget: 15,
        defaultMaxDeliveryDays: 10,
        preferredCarriers: ["cj", "epacket"],
        excludedCarriers: ["dhl"],
        requireTracking: true,
        requireInsurance: false,
        autoSelectEnabled: true,
      });

      expect(mockSet).toHaveBeenCalled();
    });
  });

  describe("getCustomsEstimateHistory", () => {
    it("returns customs estimate history", async () => {
      const mockDocs = [
        { id: "1", data: () => ({ originCountry: "CN", destinationCountry: "US", calculatedAt: new Date().toISOString() }) },
        { id: "2", data: () => ({ originCountry: "CN", destinationCountry: "GB", calculatedAt: new Date().toISOString() }) },
      ];

      mockGet.mockResolvedValue({ docs: mockDocs });

      const result = await getCustomsEstimateHistory("user1");
      expect(result.length).toBe(2);
    });

    it("returns empty array on error", async () => {
      mockGet.mockRejectedValue(new Error("Firestore error"));

      const result = await getCustomsEstimateHistory("user1");
      expect(result).toEqual([]);
    });
  });

  describe("getRateComparisonHistory", () => {
    it("returns comparison history", async () => {
      const mockDocs = [
        { id: "1", data: () => ({ originCountry: "CN", destinationCountry: "US", comparedAt: new Date().toISOString() }) },
      ];

      mockGet.mockResolvedValue({ docs: mockDocs });

      const result = await getRateComparisonHistory("user1");
      expect(result.length).toBe(1);
    });

    it("returns empty array on error", async () => {
      mockGet.mockRejectedValue(new Error("Firestore error"));

      const result = await getRateComparisonHistory("user1");
      expect(result).toEqual([]);
    });
  });

  describe("getShippingAnalytics", () => {
    it("returns analytics data", async () => {
      const mockComparisons = {
        docs: [
          { data: () => ({ selectedCarrier: "cj", selectedCost: 5, cheapestCost: 4, comparedAt: new Date().toISOString() }) },
          { data: () => ({ selectedCarrier: "dhl", selectedCost: 15, cheapestCost: 14, comparedAt: new Date().toISOString() }) },
        ],
      };
      const mockCustoms = {
        docs: [
          { data: () => ({ totalDeclaredValue: 50, calculatedAt: new Date().toISOString() }) },
        ],
      };

      mockGet
        .mockResolvedValueOnce(mockComparisons)
        .mockResolvedValueOnce(mockCustoms);

      const result = await getShippingAnalytics("user1");
      expect(result.totalComparisons).toBe(2);
      expect(result.totalCustomsCalculations).toBe(1);
    });

    it("returns defaults on error", async () => {
      mockGet.mockRejectedValue(new Error("Firestore error"));

      const result = await getShippingAnalytics("user1");
      expect(result.totalComparisons).toBe(0);
      expect(result.totalCustomsCalculations).toBe(0);
      expect(result.avgSavings).toBe(0);
    });
  });
});

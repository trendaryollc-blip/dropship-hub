import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchSuppliersTool,
  getSuppliersTool,
  getSupplierPerformanceTool,
  getSupplierAlertsTool,
  getSupplierScorecardsTool,
  getNegotiationsTool,
} from "./suppliers";
import { searchSuppliers } from "@/lib/supplier-service";

vi.mock("@/lib/supplier-service", () => ({
  searchSuppliers: vi.fn().mockResolvedValue([]),
  getSuppliers: vi.fn().mockResolvedValue([]),
}));

const mockSearchSupplierPlatforms = vi.fn();
const mockBuildSupplierProfiles = vi.fn();
const mockGetSupplierPlatformStatuses = vi.fn();
vi.mock("@/lib/supplier-platform-search", () => ({
  searchSupplierPlatforms: (...args: unknown[]) => mockSearchSupplierPlatforms(...args),
  buildSupplierProfiles: (...args: unknown[]) => mockBuildSupplierProfiles(...args),
  getSupplierPlatformStatuses: (...args: unknown[]) => mockGetSupplierPlatformStatuses(...args),
}));

vi.mock("@/lib/data/supplier-performance", () => ({
  getSupplierPerformanceHistory: vi.fn().mockResolvedValue([]),
  addSupplierPerformance: vi.fn().mockResolvedValue(undefined),
  getSupplierAlerts: vi.fn().mockResolvedValue([]),
  addSupplierAlert: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/data/srm", () => ({
  getSupplierScorecards: vi.fn().mockResolvedValue([]),
  saveSupplierScorecard: vi.fn().mockResolvedValue(undefined),
  getNegotiations: vi.fn().mockResolvedValue([]),
  addNegotiation: vi.fn().mockResolvedValue(undefined),
}));

const mockEnforceSearchDailyLimit = vi.fn();
vi.mock("@/lib/ai/tool-rate-limit", () => ({
  enforceSearchDailyLimit: (...args: unknown[]) => mockEnforceSearchDailyLimit(...args),
}));

const context = {
  uid: "test-user",
  executionId: "exec_test",
  trigger: "ai_chat" as const,
  mode: "ai_assist" as const,
};

function supplierProfile(id: string, name: string) {
  return {
    id,
    name,
    specializations: [],
    location: "Unknown",
    country: "",
    description: "",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(searchSuppliers).mockResolvedValue([]);
  mockGetSupplierPlatformStatuses.mockResolvedValue([]);
  mockSearchSupplierPlatforms.mockResolvedValue({ sources: [], errors: [], keywords: [] });
  mockBuildSupplierProfiles.mockReturnValue([]);
  mockEnforceSearchDailyLimit.mockResolvedValue({ allowed: true });
});

describe("Supplier Tools", () => {
  describe("searchSuppliersTool", () => {
    it("searches suppliers", async () => {
      const result = await searchSuppliersTool.execute({
        query: "wireless earbuds",
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("merges live platform discoveries with directory results", async () => {
      mockGetSupplierPlatformStatuses.mockResolvedValue([
        { id: "alibaba", name: "Alibaba", configured: true, method: "scraperapi", source: "env" },
        { id: "cj", name: "CJ Dropshipping", configured: false, method: "official_api", source: "env" },
      ]);
      mockSearchSupplierPlatforms.mockResolvedValue({
        sources: [{ platformId: "alibaba" }],
        errors: [],
        keywords: ["baby"],
      });
      mockBuildSupplierProfiles.mockReturnValue([supplierProfile("alibaba-store-1", "Baby Toy Factory")]);
      vi.mocked(searchSuppliers).mockResolvedValue([supplierProfile("cj-directory-1", "Directory Supplier") as never]);

      const result = await searchSuppliersTool.execute({ query: "baby toys" }, context);

      expect(mockSearchSupplierPlatforms).toHaveBeenCalledWith("baby toys", ["alibaba"]);
      const ids = (result.data as Array<{ id: string }>).map((s) => s.id);
      expect(ids).toContain("alibaba-store-1");
      expect(ids).toContain("cj-directory-1");
      expect(result.summary).toContain("discovered live");
    });

    it("skips live platform search when no platforms are configured", async () => {
      const result = await searchSuppliersTool.execute({ query: "wireless speakers" }, context);

      expect(mockSearchSupplierPlatforms).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.summary).toContain("no supplier platform keys configured");
    });

    it("reports platform errors in the summary while returning directory results", async () => {
      mockGetSupplierPlatformStatuses.mockResolvedValue([
        { id: "alibaba", name: "Alibaba", configured: true, method: "scraperapi", source: "env" },
      ]);
      mockSearchSupplierPlatforms.mockResolvedValue({
        sources: [],
        errors: [{ platform: "alibaba", name: "Alibaba", error: "ScraperAPI 429: rate limited" }],
        keywords: ["baby"],
      });
      vi.mocked(searchSuppliers).mockResolvedValue([supplierProfile("cj-directory-1", "Directory Supplier") as never]);

      const result = await searchSuppliersTool.execute({ query: "baby toys" }, context);

      expect(result.success).toBe(true);
      expect(result.summary).toContain("Alibaba: ScraperAPI 429");
      expect((result.data as unknown[]).length).toBe(1);
    });

    it("still returns directory results when the platform search throws", async () => {
      mockGetSupplierPlatformStatuses.mockResolvedValue([
        { id: "alibaba", name: "Alibaba", configured: true, method: "scraperapi", source: "env" },
      ]);
      mockSearchSupplierPlatforms.mockRejectedValue(new Error("network down"));
      vi.mocked(searchSuppliers).mockResolvedValue([supplierProfile("cj-directory-1", "Directory Supplier") as never]);

      const result = await searchSuppliersTool.execute({ query: "baby toys" }, context);

      expect(result.success).toBe(true);
      expect(result.summary).toContain("platform search failed");
      expect((result.data as unknown[]).length).toBe(1);
    });

    it("skips the live platform search when the daily search budget is exhausted", async () => {
      mockGetSupplierPlatformStatuses.mockResolvedValue([
        { id: "alibaba", name: "Alibaba", configured: true, method: "scraperapi", source: "env" },
      ]);
      mockEnforceSearchDailyLimit.mockResolvedValue({
        allowed: false,
        error: "Daily platform-search limit reached: 20 searches per day on the free tier.",
      });
      vi.mocked(searchSuppliers).mockResolvedValue([supplierProfile("cj-directory-1", "Directory Supplier") as never]);

      const result = await searchSuppliersTool.execute({ query: "baby toys" }, context);

      expect(mockEnforceSearchDailyLimit).toHaveBeenCalledWith("test-user");
      expect(mockSearchSupplierPlatforms).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.summary).toContain("platform search skipped");
      expect(result.summary).toContain("Daily platform-search limit reached");
      expect((result.data as unknown[]).length).toBe(1);
    });

    it("does not check the search budget when no platforms are configured", async () => {
      const result = await searchSuppliersTool.execute({ query: "wireless speakers" }, context);

      expect(mockEnforceSearchDailyLimit).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe("getSuppliersTool", () => {
    it("gets all suppliers", async () => {
      const result = await getSuppliersTool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("getSupplierPerformanceTool", () => {
    it("gets supplier performance history", async () => {
      const result = await getSupplierPerformanceTool.execute({
        supplierId: "cj",
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("getSupplierAlertsTool", () => {
    it("gets supplier alerts", async () => {
      const result = await getSupplierAlertsTool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("getSupplierScorecardsTool", () => {
    it("gets supplier scorecards", async () => {
      const result = await getSupplierScorecardsTool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("getNegotiationsTool", () => {
    it("gets negotiations", async () => {
      const result = await getNegotiationsTool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("gets negotiations for specific supplier", async () => {
      const result = await getNegotiationsTool.execute({
        supplierId: "cj",
      }, context);

      expect(result.success).toBe(true);
    });
  });
});

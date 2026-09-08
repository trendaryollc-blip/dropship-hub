import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchSuppliersTool,
  getSuppliersTool,
  getSupplierPerformanceTool,
  getSupplierAlertsTool,
  getSupplierScorecardsTool,
  getNegotiationsTool,
} from "./suppliers";

vi.mock("@/lib/supplier-service", () => ({
  searchSuppliers: vi.fn().mockResolvedValue([]),
  getSuppliers: vi.fn().mockResolvedValue([]),
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

const context = {
  uid: "test-user",
  executionId: "exec_test",
  trigger: "ai_chat" as const,
  mode: "ai_assist" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
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

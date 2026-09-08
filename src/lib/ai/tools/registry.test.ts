import { describe, it, expect, beforeAll } from "vitest";
import { z } from "zod";
import { ToolRegistry, createTool } from "./registry";
import {
  calculateProfitTool,
  calculateShippingTool,
  calculateLandedCostTool,
  calculateMarginTool,
  calculateAdROITool,
  calculateOrderProfitTool,
  calculateAggregatedProfitTool,
} from "./financial";

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeAll(() => {
  ToolRegistry.registerMany([
    calculateProfitTool,
    calculateShippingTool,
    calculateLandedCostTool,
    calculateMarginTool,
    calculateAdROITool,
    calculateOrderProfitTool,
    calculateAggregatedProfitTool,
  ]);
});

describe("ToolRegistry", () => {
  describe("register", () => {
    it("registers a tool successfully", () => {
      const tool = createTool({
        id: "register_test_1",
        name: "Register Test",
        description: "Test registration",
        category: "data",
        safetyLevel: "safe",
        inputSchema: z.object({}),
        execute: async () => ({ success: true, data: null, summary: "ok" }),
      });

      ToolRegistry.register(tool);
      expect(ToolRegistry.has("register_test_1")).toBe(true);
    });

    it("overwrites existing tool", () => {
      const tool1 = createTool({
        id: "overwrite_test_1",
        name: "Tool 1",
        description: "First version",
        category: "data",
        safetyLevel: "safe",
        inputSchema: z.object({}),
        execute: async () => ({ success: true, data: null, summary: "v1" }),
      });

      const tool2 = createTool({
        id: "overwrite_test_1",
        name: "Tool 2",
        description: "Second version",
        category: "data",
        safetyLevel: "moderate",
        inputSchema: z.object({}),
        execute: async () => ({ success: true, data: null, summary: "v2" }),
      });

      ToolRegistry.register(tool1);
      ToolRegistry.register(tool2);
      const tool = ToolRegistry.get("overwrite_test_1");
      expect(tool?.name).toBe("Tool 2");
    });
  });

  describe("registerMany", () => {
    it("registers multiple tools at once", () => {
      const tools = [
        createTool({
          id: "multi_test_1", name: "Multi 1", description: "First", category: "data",
          safetyLevel: "safe", inputSchema: z.object({}), execute: async () => ({ success: true, data: null, summary: "" }),
        }),
        createTool({
          id: "multi_test_2", name: "Multi 2", description: "Second", category: "data",
          safetyLevel: "safe", inputSchema: z.object({}), execute: async () => ({ success: true, data: null, summary: "" }),
        }),
      ];

      ToolRegistry.registerMany(tools);
      expect(ToolRegistry.has("multi_test_1")).toBe(true);
      expect(ToolRegistry.has("multi_test_2")).toBe(true);
    });
  });

  describe("get", () => {
    it("returns undefined for non-existent tool", () => {
      expect(ToolRegistry.get("nonexistent_tool_xyz")).toBeUndefined();
    });

    it("returns the registered tool", () => {
      const tool = createTool({
        id: "get_test_1",
        name: "Get Test",
        description: "Test get",
        category: "data",
        safetyLevel: "safe",
        inputSchema: z.object({}),
        execute: async () => ({ success: true, data: null, summary: "" }),
      });

      ToolRegistry.register(tool);
      const retrieved = ToolRegistry.get("get_test_1");
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("get_test_1");
      expect(retrieved?.name).toBe("Get Test");
    });
  });

  describe("getAll", () => {
    it("returns all registered tools", () => {
      const allTools = ToolRegistry.getAll();
      expect(Array.isArray(allTools)).toBe(true);
      expect(allTools.length).toBeGreaterThan(0);
    });
  });

  describe("getByCategory", () => {
    it("filters tools by category", () => {
      const financialTools = ToolRegistry.getByCategory("financial");
      expect(financialTools.length).toBeGreaterThan(0);
      financialTools.forEach((tool) => {
        expect(tool.category).toBe("financial");
      });
    });

    it("returns empty array for category with no tools", () => {
      const result = ToolRegistry.getByCategory("notification");
      expect(result).toEqual([]);
    });
  });

  describe("getDefinitions", () => {
    it("returns tool definitions without execute function", () => {
      const definitions = ToolRegistry.getDefinitions();
      expect(definitions.length).toBeGreaterThan(0);
      definitions.forEach((def) => {
        expect(def).toHaveProperty("id");
        expect(def).toHaveProperty("name");
        expect(def).toHaveProperty("description");
        expect(def).toHaveProperty("category");
        expect(def).toHaveProperty("safetyLevel");
        expect(def).toHaveProperty("inputSchema");
        expect(def).not.toHaveProperty("execute");
      });
    });
  });

  describe("getSafeToolIds", () => {
    it("returns only safe tool IDs", () => {
      const safeIds = ToolRegistry.getSafeToolIds();
      expect(safeIds.length).toBeGreaterThan(0);
      safeIds.forEach((id) => {
        const tool = ToolRegistry.get(id);
        expect(tool?.safetyLevel).toBe("safe");
      });
    });
  });

  describe("getToolIdsBySafety", () => {
    it("filters by safe level", () => {
      const safeIds = ToolRegistry.getToolIdsBySafety("safe");
      safeIds.forEach((id) => {
        const tool = ToolRegistry.get(id);
        expect(tool?.safetyLevel).toBe("safe");
      });
    });

    it("filters by moderate level", () => {
      const moderateIds = ToolRegistry.getToolIdsBySafety("moderate");
      moderateIds.forEach((id) => {
        const tool = ToolRegistry.get(id);
        expect(tool?.safetyLevel).toBe("moderate");
      });
    });

    it("filters by dangerous level", () => {
      const dangerousIds = ToolRegistry.getToolIdsBySafety("dangerous");
      dangerousIds.forEach((id) => {
        const tool = ToolRegistry.get(id);
        expect(tool?.safetyLevel).toBe("dangerous");
      });
    });
  });

  describe("getCategories", () => {
    it("returns unique categories", () => {
      const categories = ToolRegistry.getCategories();
      expect(categories.length).toBeGreaterThan(0);
      const unique = new Set(categories);
      expect(unique.size).toBe(categories.length);
    });
  });

  describe("executeTool", () => {
    const context = {
      uid: "test-user",
      executionId: "exec_123",
      trigger: "ai_chat" as const,
      mode: "ai_assist" as const,
    };

    it("executes a safe tool successfully", async () => {
      const result = await ToolRegistry.executeTool("calculate_profit", {
        productCost: 10,
        sellingPrice: 25,
        shippingCost: 5,
        platformFeePercent: 10,
        adSpendPerUnit: 2,
        units: 1,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("Profit");
    });

    it("returns error for non-existent tool", async () => {
      const result = await ToolRegistry.executeTool("nonexistent_tool_xyz", {}, context);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown tool");
    });

    it("returns error for invalid input", async () => {
      const result = await ToolRegistry.executeTool("calculate_profit", {
        productCost: "not_a_number",
      }, context);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("executes calculate_landed_cost tool", async () => {
      const result = await ToolRegistry.executeTool("calculate_landed_cost", {
        productCost: 10,
        shippingCost: 5,
        tariffPercent: 10,
        customsDuty: 1,
        insuranceCost: 0.5,
        platformFeePercent: 10,
        otherFees: 0,
        quantity: 1,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("executes calculate_margin tool", async () => {
      const result = await ToolRegistry.executeTool("calculate_margin", {
        costPrice: 10,
        desiredMarginPercent: 50,
        competitorPrices: [25, 30, 35],
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("executes calculate_ad_roi tool", async () => {
      const result = await ToolRegistry.executeTool("calculate_ad_roi", {
        productCost: 10,
        sellingPrice: 25,
        shippingCost: 5,
        platformFeePercent: 10,
        estimatedCTR: 2,
        estimatedCVR: 3,
        dailyBudget: 50,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("executes calculate_order_profit tool", async () => {
      const result = await ToolRegistry.executeTool("calculate_order_profit", {
        revenue: 50,
        cogs: 15,
        shippingCost: 5,
        platformFeePercent: 10,
        paymentProcessingPercent: 3,
        refunds: 0,
        adSpend: 5,
        otherCosts: 0,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("executes calculate_aggregated_profit tool", async () => {
      const result = await ToolRegistry.executeTool("calculate_aggregated_profit", {
        orders: [
          { revenue: 50, cogs: 15, shippingCost: 5, platformFee: 5, paymentProcessing: 1.5, refunds: 0, adSpend: 5, otherCosts: 0, netProfit: 23.5 },
          { revenue: 60, cogs: 18, shippingCost: 6, platformFee: 6, paymentProcessing: 1.8, refunds: 0, adSpend: 6, otherCosts: 0, netProfit: 28.2 },
        ],
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("executes calculate_shipping tool", async () => {
      const result = await ToolRegistry.executeTool("calculate_shipping", {
        weight: 0.5,
        length: 20,
        width: 15,
        height: 10,
        originCountry: "CN",
        destinationCountry: "US",
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});

describe("createTool", () => {
  it("creates a tool registration", () => {
    const tool = createTool({
      id: "created_tool_1",
      name: "Created Tool",
      description: "A created tool",
      category: "analysis",
      safetyLevel: "safe",
      inputSchema: z.object({}),
      execute: async () => ({ success: true, data: null, summary: "" }),
    });

    expect(tool.id).toBe("created_tool_1");
    expect(tool.name).toBe("Created Tool");
    expect(tool.category).toBe("analysis");
    expect(tool.safetyLevel).toBe("safe");
    expect(typeof tool.execute).toBe("function");
  });

  it("creates tool with optional estimatedCost", () => {
    const tool = createTool({
      id: "costly_tool_1",
      name: "Costly Tool",
      description: "Tool with cost",
      category: "financial",
      safetyLevel: "moderate",
      inputSchema: z.object({}),
      estimatedCost: () => 0.5,
      execute: async () => ({ success: true, data: null, summary: "" }),
    });

    expect(tool.estimatedCost).toBeDefined();
    expect(tool.estimatedCost?.({})).toBe(0.5);
  });

  it("creates tool without optional estimatedCost", () => {
    const tool = createTool({
      id: "free_tool_1",
      name: "Free Tool",
      description: "Tool without cost",
      category: "data",
      safetyLevel: "safe",
      inputSchema: z.object({}),
      execute: async () => ({ success: true, data: null, summary: "" }),
    });

    expect(tool.estimatedCost).toBeUndefined();
  });
});

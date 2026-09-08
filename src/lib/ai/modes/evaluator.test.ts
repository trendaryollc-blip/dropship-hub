import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "../tools/registry";
import { evaluateToolExecution, evaluateAutoTriggers, toolIdToFeature } from "./evaluator";

vi.mock("./user-prefs", () => ({
  getAutonomyLevel: vi.fn(),
  getFeatureMode: vi.fn(),
  getEnabledAutoRules: vi.fn(),
}));

import { getAutonomyLevel, getFeatureMode, getEnabledAutoRules } from "./user-prefs";

beforeEach(() => {
  vi.clearAllMocks();
  
  // Register test tool
  ToolRegistry.register({
    id: "calculate_profit",
    name: "Calculate Profit",
    description: "Calculates profit",
    safetyLevel: "safe",
    category: "financial",
    inputSchema: z.object({}).passthrough(),
    execute: vi.fn(),
  });
});

describe("Mode Evaluator", () => {
  describe("evaluateToolExecution", () => {
    it("blocks execution in manual mode", async () => {
      vi.mocked(getFeatureMode).mockResolvedValue("manual");
      vi.mocked(getAutonomyLevel).mockResolvedValue(1);

      const result = await evaluateToolExecution("user_1", "calculate_profit", "financial");
      expect(result.shouldExecute).toBe(false);
      expect(result.mode).toBe("manual");
      expect(result.reason).toContain("manual mode");
    });

    it("allows execution in auto mode for valid tool", async () => {
      vi.mocked(getFeatureMode).mockResolvedValue("auto");
      vi.mocked(getAutonomyLevel).mockResolvedValue(1);

      const result = await evaluateToolExecution("user_1", "calculate_profit", "financial");
      expect(result.shouldExecute).toBe(true);
      expect(result.mode).toBe("auto");
    });

    it("blocks execution in auto mode for non-existent tool", async () => {
      vi.mocked(getFeatureMode).mockResolvedValue("auto");
      vi.mocked(getAutonomyLevel).mockResolvedValue(1);

      const result = await evaluateToolExecution("user_1", "nonexistent_tool", "financial");
      expect(result.shouldExecute).toBe(false);
      expect(result.reason).toContain("Tool not found");
    });

    it("allows execution in ai_assist mode with autonomy level 1", async () => {
      vi.mocked(getFeatureMode).mockResolvedValue("ai_assist");
      vi.mocked(getAutonomyLevel).mockResolvedValue(1);

      const result = await evaluateToolExecution("user_1", "calculate_profit", "financial");
      expect(result.shouldExecute).toBe(true);
      expect(result.mode).toBe("ai_assist");
    });

    it("blocks execution in ai_assist mode with autonomy level 0", async () => {
      vi.mocked(getFeatureMode).mockResolvedValue("ai_assist");
      vi.mocked(getAutonomyLevel).mockResolvedValue(0);

      const result = await evaluateToolExecution("user_1", "calculate_profit", "financial");
      expect(result.shouldExecute).toBe(false);
      expect(result.reason).toContain("Advisory only");
    });
  });

  describe("evaluateAutoTriggers", () => {
    it("returns empty array when no enabled rules", async () => {
      vi.mocked(getEnabledAutoRules).mockResolvedValue([]);
      const triggers = await evaluateAutoTriggers("user_1");
      expect(triggers).toEqual([]);
    });

    it("returns triggers for scheduled rules", async () => {
      vi.mocked(getEnabledAutoRules).mockResolvedValue([
        {
          id: "rule_1",
          uid: "user_1",
          toolId: "get_alerts",
          enabled: true,
          trigger: "schedule",
          schedule: "hourly",
          params: {},
          lastRunAt: null,
          nextRunAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      const triggers = await evaluateAutoTriggers("user_1");
      expect(triggers.length).toBe(1);
      expect(triggers[0].toolId).toBe("get_alerts");
    });

    it("does not trigger schedule if not enough time passed", async () => {
      const recentTime = new Date(Date.now() - 1000).toISOString(); // 1 second ago
      vi.mocked(getEnabledAutoRules).mockResolvedValue([
        {
          id: "rule_2",
          uid: "user_1",
          toolId: "get_alerts",
          enabled: true,
          trigger: "schedule",
          schedule: "hourly",
          params: {},
          lastRunAt: recentTime,
          nextRunAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      const triggers = await evaluateAutoTriggers("user_1");
      expect(triggers.length).toBe(0);
    });

    it("triggers schedule when enough time has passed", async () => {
      const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      vi.mocked(getEnabledAutoRules).mockResolvedValue([
        {
          id: "rule_3",
          uid: "user_1",
          toolId: "get_alerts",
          enabled: true,
          trigger: "schedule",
          schedule: "hourly",
          params: { limit: 10 },
          lastRunAt: oldTime,
          nextRunAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      const triggers = await evaluateAutoTriggers("user_1");
      expect(triggers.length).toBe(1);
      expect(triggers[0].params).toEqual({ limit: 10 });
    });
  });

  describe("toolIdToFeature", () => {
    it("maps product tools to products feature", () => {
      expect(toolIdToFeature("search_products")).toBe("products");
      expect(toolIdToFeature("save_product")).toBe("products");
      expect(toolIdToFeature("remove_product")).toBe("products");
    });

    it("maps supplier tools to suppliers feature", () => {
      expect(toolIdToFeature("search_suppliers")).toBe("suppliers");
      expect(toolIdToFeature("get_supplier_performance")).toBe("suppliers");
    });

    it("maps order tools to orders feature", () => {
      expect(toolIdToFeature("get_orders")).toBe("orders");
      expect(toolIdToFeature("route_order")).toBe("orders");
      expect(toolIdToFeature("place_order")).toBe("orders");
    });

    it("maps financial tools to financial feature", () => {
      expect(toolIdToFeature("get_profit")).toBe("financial");
      expect(toolIdToFeature("get_revenue")).toBe("financial");
    });

    it("maps store tools to store feature", () => {
      expect(toolIdToFeature("push_to_store")).toBe("store");
      expect(toolIdToFeature("sync_inventory")).toBe("store");
    });

    it("maps intelligence tools to intelligence feature", () => {
      expect(toolIdToFeature("get_health_score")).toBe("intelligence");
      expect(toolIdToFeature("get_daily_digest")).toBe("intelligence");
    });

    it("maps monitoring tools to monitoring feature", () => {
      expect(toolIdToFeature("get_alerts")).toBe("monitoring");
      expect(toolIdToFeature("monitor_price")).toBe("monitoring");
    });

    it("maps shipping tools to shipping feature", () => {
      expect(toolIdToFeature("compare_shipping_rates")).toBe("shipping");
      expect(toolIdToFeature("predict_delivery")).toBe("shipping");
    });

    it("maps pricing tools to pricing feature", () => {
      expect(toolIdToFeature("optimize_pricing")).toBe("pricing");
      expect(toolIdToFeature("evaluate_price_rule")).toBe("pricing");
    });

    it("returns 'other' for unknown tool", () => {
      expect(toolIdToFeature("unknown_tool_xyz")).toBe("other");
    });
  });
});

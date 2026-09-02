import { describe, it, expect } from "vitest";
import {
  matchRules,
  shouldAutoApprove,
  shouldRequireManual,
  getMaxCost,
  shouldCancelOrder,
  validateRule,
  createDefaultRules,
} from "@/lib/fulfillment/rules-engine";
import type { FulfillmentRule } from "@/types/automation";

const testRules: FulfillmentRule[] = [
  {
    id: "rule_1",
    name: "CJ Primary",
    description: "Route to CJ",
    enabled: true,
    priority: 1,
    conditions: [
      { field: "supplier_id", operator: "equals", value: "cj" },
      { field: "stock_level", operator: "greater_than", value: 0 },
    ],
    actions: [
      { type: "route_to_supplier", params: { supplierId: "cj" } },
      { type: "auto_approve", params: { enabled: true } },
    ],
    fallbackAction: { type: "route_to_supplier", params: { supplierId: "aliexpress" } },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule_2",
    name: "High Value Manual",
    description: "Manual review for high value",
    enabled: true,
    priority: 0,
    conditions: [
      { field: "order_total", operator: "greater_than", value: 100 },
    ],
    actions: [
      { type: "require_manual", params: { reason: "High value" } },
    ],
    fallbackAction: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule_3",
    name: "Low Margin Block",
    description: "Block low margin",
    enabled: true,
    priority: 2,
    conditions: [
      { field: "profit_margin", operator: "less_than", value: 10 },
    ],
    actions: [
      { type: "cancel_order", params: { reason: "Low margin" } },
    ],
    fallbackAction: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule_disabled",
    name: "Disabled Rule",
    description: "This rule is disabled",
    enabled: false,
    priority: 0,
    conditions: [
      { field: "supplier_id", operator: "equals", value: "disabled" },
    ],
    actions: [
      { type: "auto_approve", params: { enabled: true } },
    ],
    fallbackAction: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("Rules Engine", () => {
  describe("matchRules", () => {
    it("matches rule when all conditions met", () => {
      const result = matchRules(testRules, {
        supplierId: "cj",
        stockLevel: 50,
      });
      expect(result.matchedRule).toBeDefined();
      expect(result.matchedRule!.id).toBe("rule_1");
      expect(result.actions.length).toBeGreaterThan(0);
    });

    it("does not match when conditions not met", () => {
      const result = matchRules(testRules, {
        supplierId: "amazon",
        stockLevel: 50,
      });
      expect(result.matchedRule?.id).not.toBe("rule_1");
    });

    it("skips disabled rules", () => {
      const result = matchRules(testRules, {
        supplierId: "disabled",
      });
      expect(result.matchedRule?.id).not.toBe("rule_disabled");
    });

    it("returns fallback action from matched rule", () => {
      const result = matchRules(testRules, {
        supplierId: "cj",
        stockLevel: 50,
      });
      expect(result.fallbackAction).toBeDefined();
      expect(result.fallbackAction!.type).toBe("route_to_supplier");
    });

    it("matches high value order rule", () => {
      const result = matchRules(testRules, {
        orderTotal: 150,
      });
      expect(result.matchedRule?.id).toBe("rule_2");
    });

    it("matches low margin rule", () => {
      const result = matchRules(testRules, {
        profitMargin: 5,
      });
      expect(result.matchedRule?.id).toBe("rule_3");
    });

    it("respects priority ordering", () => {
      const result = matchRules(testRules, {
        supplierId: "cj",
        stockLevel: 50,
        orderTotal: 150,
      });
      expect(result.matchedRule!.priority).toBe(0);
    });
  });

  describe("shouldAutoApprove", () => {
    it("returns true when auto_approve action present", () => {
      const actions = [
        { type: "auto_approve" as const, params: { enabled: true } },
      ];
      expect(shouldAutoApprove(actions)).toBe(true);
    });

    it("returns false when no auto_approve action", () => {
      const actions = [
        { type: "route_to_supplier" as const, params: { supplierId: "cj" } },
      ];
      expect(shouldAutoApprove(actions)).toBe(false);
    });

    it("returns false when auto_approve disabled", () => {
      const actions = [
        { type: "auto_approve" as const, params: { enabled: false } },
      ];
      expect(shouldAutoApprove(actions)).toBe(false);
    });
  });

  describe("shouldRequireManual", () => {
    it("returns true when require_manual action present", () => {
      const actions = [
        { type: "require_manual" as const, params: { reason: "test" } },
      ];
      expect(shouldRequireManual(actions)).toBe(true);
    });

    it("returns false when no require_manual action", () => {
      const actions = [
        { type: "auto_approve" as const, params: { enabled: true } },
      ];
      expect(shouldRequireManual(actions)).toBe(false);
    });
  });

  describe("getMaxCost", () => {
    it("returns max cost from action", () => {
      const actions = [
        { type: "set_max_cost" as const, params: { maxCost: 50 } },
      ];
      expect(getMaxCost(actions)).toBe(50);
    });

    it("returns null when no set_max_cost action", () => {
      const actions = [
        { type: "auto_approve" as const, params: { enabled: true } },
      ];
      expect(getMaxCost(actions)).toBeNull();
    });
  });

  describe("shouldCancelOrder", () => {
    it("returns true when cancel_order action present", () => {
      const actions = [
        { type: "cancel_order" as const, params: { reason: "test" } },
      ];
      expect(shouldCancelOrder(actions)).toBe(true);
    });

    it("returns false when no cancel_order action", () => {
      const actions = [
        { type: "auto_approve" as const, params: { enabled: true } },
      ];
      expect(shouldCancelOrder(actions)).toBe(false);
    });
  });

  describe("validateRule", () => {
    it("validates a correct rule", () => {
      const result = validateRule(testRules[0]);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("rejects rule without name", () => {
      const result = validateRule({ ...testRules[0], name: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects rule without conditions", () => {
      const result = validateRule({ ...testRules[0], conditions: [] });
      expect(result.valid).toBe(false);
    });

    it("rejects rule without actions", () => {
      const result = validateRule({ ...testRules[0], actions: [] });
      expect(result.valid).toBe(false);
    });

    it("rejects rule with invalid priority", () => {
      const result = validateRule({ ...testRules[0], priority: -1 });
      expect(result.valid).toBe(false);
    });
  });

  describe("createDefaultRules", () => {
    it("creates default rules", () => {
      const rules = createDefaultRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((r) => r.id && r.name)).toBe(true);
    });

    it("includes CJ primary rule", () => {
      const rules = createDefaultRules();
      expect(rules.some((r) => r.id === "rule_cj_primary")).toBe(true);
    });
  });
});

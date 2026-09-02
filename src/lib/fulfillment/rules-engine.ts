import type { FulfillmentRule, RuleCondition, RuleAction, FulfillmentRuleSchema } from "@/types/automation";
import { FulfillmentRuleSchema as RuleSchema } from "@/types/automation";

interface RuleContext {
  supplierId?: string;
  supplierReliability?: number;
  supplierShippingDays?: number;
  productCost?: number;
  orderTotal?: number;
  customerCountry?: string;
  customerState?: string;
  productCategory?: string;
  stockLevel?: number;
  profitMargin?: number;
  storePlatform?: string;
  orderAgeHours?: number;
}

function evaluateCondition(condition: RuleCondition, context: RuleContext): boolean {
  const fieldMap: Record<string, keyof RuleContext> = {
    supplier_id: "supplierId",
    supplier_reliability: "supplierReliability",
    supplier_shipping_days: "supplierShippingDays",
    product_cost: "productCost",
    order_total: "orderTotal",
    customer_country: "customerCountry",
    customer_state: "customerState",
    product_category: "productCategory",
    stock_level: "stockLevel",
    profit_margin: "profitMargin",
    store_platform: "storePlatform",
    order_age_hours: "orderAgeHours",
  };

  const contextKey = fieldMap[condition.field];
  const fieldValue = contextKey ? context[contextKey] : undefined;
  const { operator, value } = condition;

  if (fieldValue === undefined || fieldValue === null) return false;

  switch (operator) {
    case "equals":
      return String(fieldValue) === String(value);
    case "not_equals":
      return String(fieldValue) !== String(value);
    case "greater_than":
      return Number(fieldValue) > Number(value);
    case "less_than":
      return Number(fieldValue) < Number(value);
    case "greater_or_equal":
      return Number(fieldValue) >= Number(value);
    case "less_or_equal":
      return Number(fieldValue) <= Number(value);
    case "contains":
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    case "in_list": {
      const list = String(value).split(",").map((s) => s.trim().toLowerCase());
      return list.includes(String(fieldValue).toLowerCase());
    }
    case "not_in_list": {
      const list = String(value).split(",").map((s) => s.trim().toLowerCase());
      return !list.includes(String(fieldValue).toLowerCase());
    }
    default:
      return false;
  }
}

function evaluateRule(rule: FulfillmentRule, context: RuleContext): boolean {
  if (!rule.enabled) return false;
  return rule.conditions.every((condition) => evaluateCondition(condition, context));
}

export function matchRules(rules: FulfillmentRule[], context: RuleContext): {
  matchedRule: FulfillmentRule | null;
  actions: RuleAction[];
  fallbackAction: RuleAction | null;
} {
  const sortedRules = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (evaluateRule(rule, context)) {
      return {
        matchedRule: rule,
        actions: rule.actions,
        fallbackAction: rule.fallbackAction,
      };
    }
  }

  return {
    matchedRule: null,
    actions: [],
    fallbackAction: null,
  };
}

export function getRouteToSupplierAction(actions: RuleAction[]): RuleAction | null {
  return actions.find((a) => a.type === "route_to_supplier") || null;
}

export function shouldAutoApprove(actions: RuleAction[]): boolean {
  const action = actions.find((a) => a.type === "auto_approve");
  return action ? Boolean(action.params.enabled) : false;
}

export function shouldRequireManual(actions: RuleAction[]): boolean {
  return actions.some((a) => a.type === "require_manual");
}

export function getMaxCost(actions: RuleAction[]): number | null {
  const action = actions.find((a) => a.type === "set_max_cost");
  return action ? Number(action.params.maxCost) : null;
}

export function getNotifyAction(actions: RuleAction[]): RuleAction | null {
  return actions.find((a) => a.type === "notify") || null;
}

export function shouldCancelOrder(actions: RuleAction[]): boolean {
  return actions.some((a) => a.type === "cancel_order");
}

export function validateRule(rule: FulfillmentRule): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rule.name || rule.name.length === 0) errors.push("Rule name is required");
  if (rule.name.length > 200) errors.push("Rule name must be 200 characters or less");
  if (rule.conditions.length === 0) errors.push("At least one condition is required");
  if (rule.actions.length === 0) errors.push("At least one action is required");
  if (rule.priority < 0 || rule.priority > 1000) errors.push("Priority must be between 0 and 1000");

  for (const condition of rule.conditions) {
    if (!condition.field) errors.push("Condition field is required");
    if (!condition.operator) errors.push("Condition operator is required");
    if (condition.value === undefined || condition.value === null) {
      errors.push("Condition value is required");
    }
  }

  for (const action of rule.actions) {
    if (!action.type) errors.push("Action type is required");
  }

  return { valid: errors.length === 0, errors };
}

export function createDefaultRules(): FulfillmentRule[] {
  return [
    {
      id: "rule_cj_primary",
      name: "CJ Dropshipping Primary",
      description: "Route to CJ when in stock and reliable",
      enabled: true,
      priority: 1,
      conditions: [
        { field: "supplier_id", operator: "equals", value: "cj" },
        { field: "stock_level", operator: "greater_than", value: 0 },
        { field: "supplier_reliability", operator: "greater_or_equal", value: 80 },
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
      id: "rule_high_value_manual",
      name: "High Value Orders - Manual Review",
      description: "Require manual review for orders over $100",
      enabled: true,
      priority: 0,
      conditions: [
        { field: "order_total", operator: "greater_than", value: 100 },
      ],
      actions: [
        { type: "require_manual", params: { reason: "High value order" } },
        { type: "notify", params: { channel: "email", message: "High value order requires review" } },
      ],
      fallbackAction: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "rule_low_margin_block",
      name: "Low Margin Block",
      description: "Cancel orders with profit margin below 10%",
      enabled: true,
      priority: 2,
      conditions: [
        { field: "profit_margin", operator: "less_than", value: 10 },
      ],
      actions: [
        { type: "cancel_order", params: { reason: "Profit margin too low" } },
        { type: "notify", params: { channel: "email", message: "Order cancelled: margin below threshold" } },
      ],
      fallbackAction: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "rule_us_speed",
      name: "US Customers - Speed Priority",
      description: "For US customers, prefer fastest shipping",
      enabled: true,
      priority: 3,
      conditions: [
        { field: "customer_country", operator: "equals", value: "US" },
        { field: "order_total", operator: "less_than", value: 100 },
      ],
      actions: [
        { type: "route_to_supplier", params: { supplierId: "amazon" } },
      ],
      fallbackAction: { type: "route_to_supplier", params: { supplierId: "cj" } },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

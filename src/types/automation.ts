import { z } from "zod";

// ─── Automation Status ───────────────────────────────────────────────────────

export type AutomationStatus =
  | "idle"
  | "detecting"
  | "routing"
  | "checking_inventory"
  | "validating_profit"
  | "placing_order"
  | "awaiting_tracking"
  | "syncing_tracking"
  | "completed"
  | "failed"
  | "needs_manual"
  | "cancelled";

export type AutomationTrigger = "webhook" | "poll" | "manual" | "bulk" | "scheduled";

export type AuditAction =
  | "order_detected"
  | "order_routed"
  | "order_approved"
  | "order_placed"
  | "order_failed"
  | "order_cancelled"
  | "tracking_synced"
  | "tracking_detected"
  | "fallback_triggered"
  | "profit_rejected"
  | "inventory_unavailable"
  | "sla_breach"
  | "bulk_started"
  | "bulk_completed"
  | "bulk_partial"
  | "rules_updated"
  | "settings_updated";

// ─── Fulfillment Rule ────────────────────────────────────────────────────────

export interface FulfillmentRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  fallbackAction: RuleAction | null;
  createdAt: string;
  updatedAt: string;
}

export interface RuleCondition {
  field: RuleField;
  operator: RuleOperator;
  value: string | number | boolean;
}

export type RuleField =
  | "supplier_id"
  | "supplier_reliability"
  | "supplier_shipping_days"
  | "product_cost"
  | "order_total"
  | "customer_country"
  | "customer_state"
  | "product_category"
  | "stock_level"
  | "profit_margin"
  | "store_platform"
  | "order_age_hours";

export type RuleOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_or_equal"
  | "less_or_equal"
  | "contains"
  | "in_list"
  | "not_in_list";

export interface RuleAction {
  type: "route_to_supplier" | "set_priority" | "auto_approve" | "require_manual" | "set_max_cost" | "notify" | "cancel_order";
  params: Record<string, string | number | boolean>;
}

// ─── Routing Result ──────────────────────────────────────────────────────────

export interface RoutingResult {
  orderId: string;
  selectedSupplier: RoutingSupplierChoice;
  alternatives: RoutingSupplierChoice[];
  reason: string;
  routedAt: string;
  ruleId: string | null;
  trigger: AutomationTrigger;
}

export interface RoutingSupplierChoice {
  supplierId: string;
  supplierName: string;
  unitCost: number;
  shippingCost: number;
  totalCost: number;
  shippingDays: number;
  inStock: boolean;
  stockLevel: number;
  reliabilityScore: number;
  qualityScore: number;
  totalScore: number;
  rejectionReason?: string;
}

// ─── Automation Pipeline State ───────────────────────────────────────────────

export interface AutomationPipelineState {
  orderId: string;
  status: AutomationStatus;
  trigger: AutomationTrigger;
  currentStep: string;
  selectedSupplier: string | null;
  cjOrderId: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
  steps: AutomationStep[];
}

export interface AutomationStep {
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  data: Record<string, unknown>;
}

// ─── Audit Log Entry ─────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  orderId: string;
  action: AuditAction;
  details: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

// ─── Bulk Operation ──────────────────────────────────────────────────────────

export interface BulkOperation {
  id: string;
  orderIds: string[];
  action: "fulfill" | "cancel" | "sync_tracking" | "check_status" | "place_orders";
  status: "pending" | "running" | "completed" | "partial" | "failed";
  totalOrders: number;
  processedOrders: number;
  successfulOrders: number;
  failedOrders: number;
  errors: BulkOperationError[];
  startedAt: string;
  completedAt: string | null;
}

export interface BulkOperationError {
  orderId: string;
  error: string;
}

// ─── SLA Config ──────────────────────────────────────────────────────────────

export interface SLAConfig {
  maxProcessingHours: number;
  maxFulfillmentHours: number;
  maxShippingDays: number;
  maxDeliveryDays: number;
  breachNotificationEnabled: boolean;
  autoCancelOnBreach: boolean;
}

// ─── Profit Guard Config ─────────────────────────────────────────────────────

export interface ProfitGuardConfig {
  enabled: boolean;
  minProfitMarginPercent: number;
  minProfitAbsolute: number;
  maxCostMultiplier: number;
  blockOnLowMargin: boolean;
}

// ─── Inventory Check Result ──────────────────────────────────────────────────

export interface InventoryCheckResult {
  supplierId: string;
  productId: string;
  inStock: boolean;
  stockLevel: number;
  lastChecked: string;
}

// ─── CJ Polling State ────────────────────────────────────────────────────────

export interface CJPollingState {
  userId: string;
  activeOrders: CJPollingOrder[];
  lastPollAt: string;
  pollIntervalMs: number;
  maxRetries: number;
}

export interface CJPollingOrder {
  orderId: string;
  cjOrderNumber: string;
  retryCount: number;
  lastCheckedAt: string;
  status: string;
}

// ─── Zod Schemas for Validation ──────────────────────────────────────────────

export const RuleConditionSchema = z.object({
  field: z.enum([
    "supplier_id", "supplier_reliability", "supplier_shipping_days",
    "product_cost", "order_total", "customer_country", "customer_state",
    "product_category", "stock_level", "profit_margin", "store_platform", "order_age_hours",
  ]),
  operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "greater_or_equal", "less_or_equal", "contains", "in_list", "not_in_list"]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const RuleActionSchema = z.object({
  type: z.enum(["route_to_supplier", "set_priority", "auto_approve", "require_manual", "set_max_cost", "notify", "cancel_order"]),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const FulfillmentRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  enabled: z.boolean(),
  priority: z.number().int().min(0).max(1000),
  conditions: z.array(RuleConditionSchema),
  actions: z.array(RuleActionSchema),
  fallbackAction: RuleActionSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SLAConfigSchema = z.object({
  maxProcessingHours: z.number().min(0),
  maxFulfillmentHours: z.number().min(0),
  maxShippingDays: z.number().min(0),
  maxDeliveryDays: z.number().min(0),
  breachNotificationEnabled: z.boolean(),
  autoCancelOnBreach: z.boolean(),
});

export const ProfitGuardConfigSchema = z.object({
  enabled: z.boolean(),
  minProfitMarginPercent: z.number().min(0).max(100),
  minProfitAbsolute: z.number().min(0),
  maxCostMultiplier: z.number().min(1),
  blockOnLowMargin: z.boolean(),
});

export const AutomationPipelineStateSchema = z.object({
  orderId: z.string(),
  status: z.enum(["idle", "detecting", "routing", "checking_inventory", "validating_profit", "placing_order", "awaiting_tracking", "syncing_tracking", "completed", "failed", "needs_manual", "cancelled"]),
  trigger: z.enum(["webhook", "poll", "manual", "bulk", "scheduled"]),
  currentStep: z.string(),
  selectedSupplier: z.string().nullable(),
  cjOrderId: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  carrier: z.string().nullable(),
  error: z.string().nullable(),
  retryCount: z.number(),
  maxRetries: z.number(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  updatedAt: z.string(),
  steps: z.array(z.object({
    name: z.string(),
    status: z.enum(["pending", "running", "completed", "failed", "skipped"]),
    startedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    error: z.string().nullable(),
    data: z.record(z.string(), z.unknown()),
  })),
});

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  orderId: z.string(),
  action: z.enum([
    "order_detected", "order_routed", "order_approved", "order_placed",
    "order_failed", "order_cancelled", "tracking_synced", "tracking_detected",
    "fallback_triggered", "profit_rejected", "inventory_unavailable",
    "sla_breach", "bulk_started", "bulk_completed", "bulk_partial",
    "rules_updated", "settings_updated",
  ]),
  details: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  timestamp: z.string(),
});

export const BulkOperationSchema = z.object({
  id: z.string(),
  orderIds: z.array(z.string()),
  action: z.enum(["fulfill", "cancel", "sync_tracking", "check_status", "place_orders"]),
  status: z.enum(["pending", "running", "completed", "partial", "failed"]),
  totalOrders: z.number(),
  processedOrders: z.number(),
  successfulOrders: z.number(),
  failedOrders: z.number(),
  errors: z.array(z.object({
    orderId: z.string(),
    error: z.string(),
  })),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
});

// ─── Default Configs ─────────────────────────────────────────────────────────

export const DEFAULT_SLA_CONFIG: SLAConfig = {
  maxProcessingHours: 2,
  maxFulfillmentHours: 24,
  maxShippingDays: 3,
  maxDeliveryDays: 30,
  breachNotificationEnabled: true,
  autoCancelOnBreach: false,
};

export const DEFAULT_PROFIT_GUARD_CONFIG: ProfitGuardConfig = {
  enabled: true,
  minProfitMarginPercent: 15,
  minProfitAbsolute: 2,
  maxCostMultiplier: 3,
  blockOnLowMargin: true,
};

export const DEFAULT_FULFILLMENT_RULES: FulfillmentRule[] = [
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
];

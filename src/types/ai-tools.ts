// ─── AI Tool System Types ───────────────────────────────────────────────────
// Public type exports for the AI execution layer

export type {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  ToolExecutionRecord,
  ToolCall,
  ToolSafetyLevel,
  ToolCategory,
  AutonomyLevel,
  ExecutionMode,
  WorkflowStep,
  WorkflowDefinition,
  AutoModeRule,
  AIAuditLogEntry,
  GuardrailConfig,
  AIModePreferences,
} from "@/lib/ai/types";

export {
  AUTONOMY_LABELS,
  ToolCallSchema,
  ExecutionModeSchema,
  AutonomyLevelSchema,
  ToolSafetyLevelSchema,
  ToolExecutionRecordSchema,
  GuardrailConfigSchema,
  AutoModeRuleSchema,
  AIModePreferencesSchema,
  DEFAULT_GUARDRAILS,
  DEFAULT_MODE_PREFERENCES,
} from "@/lib/ai/types";

// ─── Tool Registration Helper Types ─────────────────────────────────────────

import type { z } from "zod";
import type {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  ToolCategory,
  ToolSafetyLevel,
} from "@/lib/ai/types";

export type ToolExecuteFn = (
  input: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<ToolResult>;

export interface ToolRegistration extends ToolDefinition {
  execute: ToolExecuteFn;
}

// ─── Feature-Mode Mapping ───────────────────────────────────────────────────

export const FEATURE_TOOL_MAP: Record<string, string[]> = {
  products: ["search_products", "analyze_product", "validate_product", "compare_products", "save_product", "remove_product", "get_product_details", "find_similar_products", "check_availability", "get_product_reviews", "track_product_price", "set_price_alert", "analyze_niche", "get_trending_products"],
  suppliers: ["search_suppliers", "compare_suppliers", "set_default_supplier", "get_supplier_performance", "get_supplier_scorecard", "send_supplier_message", "track_negotiation", "get_supplier_inventory"],
  orders: ["get_orders", "route_order", "bulk_route_orders", "place_order", "bulk_place_orders", "get_tracking", "sync_tracking", "get_fulfillment_status", "optimize_fulfillment", "process_returns"],
  financial: ["get_profit", "get_revenue", "calculate_cogs", "get_margin", "run_pnl_report", "run_cashflow_report", "calculate_tax", "get_cost_breakdown", "get_profit_by_product", "get_profit_by_platform"],
  store: ["push_to_store", "push_bulk_to_store", "sync_inventory", "get_store_products", "update_store_product", "remove_store_product", "get_store_performance"],
  intelligence: ["get_health_score", "get_daily_digest", "get_daily_missions", "get_recommendations", "get_market_intel", "get_competitor_intel", "get_pricing_intel", "get_ad_recommendations", "generate_listing", "generate_creative"],
  monitoring: ["monitor_price", "monitor_stock", "monitor_competitor", "get_alerts", "set_alert"],
  shipping: ["compare_shipping_rates", "predict_delivery", "auto_select_shipping", "calculate_customs", "get_shipping_options"],
  pricing: ["optimize_pricing", "evaluate_price_rule", "calculate_floor_price"],
};

// ─── Tool ID Constants ──────────────────────────────────────────────────────

export const TOOL_IDS = {
  // Search & Discovery
  SEARCH_PRODUCTS: "search_products",
  ANALYZE_PRODUCT: "analyze_product",
  VALIDATE_PRODUCT: "validate_product",
  COMPARE_PRODUCTS: "compare_products",
  SAVE_PRODUCT: "save_product",
  REMOVE_PRODUCT: "remove_product",
  GET_PRODUCT_DETAILS: "get_product_details",
  FIND_SIMILAR_PRODUCTS: "find_similar_products",
  CHECK_AVAILABILITY: "check_availability",
  GET_PRODUCT_REVIEWS: "get_product_reviews",
  TRACK_PRODUCT_PRICE: "track_product_price",
  SET_PRICE_ALERT: "set_price_alert",
  ANALYZE_NICHE: "analyze_niche",
  GET_TRENDING_PRODUCTS: "get_trending_products",

  // Supplier
  SEARCH_SUPPLIERS: "search_suppliers",
  COMPARE_SUPPLIERS: "compare_suppliers",
  SET_DEFAULT_SUPPLIER: "set_default_supplier",
  GET_SUPPLIER_PERFORMANCE: "get_supplier_performance",
  GET_SUPPLIER_SCORECARD: "get_supplier_scorecard",
  SEND_SUPPLIER_MESSAGE: "send_supplier_message",
  TRACK_NEGOTIATION: "track_negotiation",
  GET_SUPPLIER_INVENTORY: "get_supplier_inventory",

  // Orders & Fulfillment
  GET_ORDERS: "get_orders",
  ROUTE_ORDER: "route_order",
  BULK_ROUTE_ORDERS: "bulk_route_orders",
  PLACE_ORDER: "place_order",
  BULK_PLACE_ORDERS: "bulk_place_orders",
  GET_TRACKING: "get_tracking",
  SYNC_TRACKING: "sync_tracking",
  GET_FULFILLMENT_STATUS: "get_fulfillment_status",
  OPTIMIZE_FULFILLMENT: "optimize_fulfillment",
  PROCESS_RETURNS: "process_returns",

  // Financial
  GET_PROFIT: "get_profit",
  GET_REVENUE: "get_revenue",
  CALCULATE_COGS: "calculate_cogs",
  GET_MARGIN: "get_margin",
  RUN_PNL_REPORT: "run_pnl_report",
  RUN_CASHFLOW_REPORT: "run_cashflow_report",
  CALCULATE_TAX: "calculate_tax",
  GET_COST_BREAKDOWN: "get_cost_breakdown",
  GET_PROFIT_BY_PRODUCT: "get_profit_by_product",
  GET_PROFIT_BY_PLATFORM: "get_profit_by_platform",

  // Store
  PUSH_TO_STORE: "push_to_store",
  PUSH_BULK_TO_STORE: "push_bulk_to_store",
  SYNC_INVENTORY: "sync_inventory",
  GET_STORE_PRODUCTS: "get_store_products",
  UPDATE_STORE_PRODUCT: "update_store_product",
  REMOVE_STORE_PRODUCT: "remove_store_product",
  GET_STORE_PERFORMANCE: "get_store_performance",

  // Intelligence
  GET_HEALTH_SCORE: "get_health_score",
  GET_DAILY_DIGEST: "get_daily_digest",
  GET_DAILY_MISSIONS: "get_daily_missions",
  GET_RECOMMENDATIONS: "get_recommendations",
  GET_MARKET_INTEL: "get_market_intel",
  GET_COMPETITOR_INTEL: "get_competitor_intel",
  GET_PRICING_INTEL: "get_pricing_intel",
  GET_AD_RECOMMENDATIONS: "get_ad_recommendations",
  GENERATE_LISTING: "generate_listing",
  GENERATE_CREATIVE: "generate_creative",

  // Monitoring
  MONITOR_PRICE: "monitor_price",
  MONITOR_STOCK: "monitor_stock",
  MONITOR_COMPETITOR: "monitor_competitor",
  GET_ALERTS: "get_alerts",
  SET_ALERT: "set_alert",

  // Shipping
  COMPARE_SHIPPING_RATES: "compare_shipping_rates",
  PREDICT_DELIVERY: "predict_delivery",
  AUTO_SELECT_SHIPPING: "auto_select_shipping",
  CALCULATE_CUSTOMS: "calculate_customs",
  GET_SHIPPING_OPTIONS: "get_shipping_options",

  // Pricing
  OPTIMIZE_PRICING: "optimize_pricing",
  EVALUATE_PRICE_RULE: "evaluate_price_rule",
  CALCULATE_FLOOR_PRICE: "calculate_floor_price",
} as const;

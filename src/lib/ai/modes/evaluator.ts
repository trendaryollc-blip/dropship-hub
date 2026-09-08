import { getAutonomyLevel, getFeatureMode, getEnabledAutoRules } from "./user-prefs";
import { ToolRegistry } from "../tools/registry";
import type { ExecutionMode, AutonomyLevel } from "../types";

// ─── Mode Evaluator ─────────────────────────────────────────────────────────
// Determines whether a tool should execute based on the user's mode settings
// and the tool's category/safety level.

interface EvaluationResult {
  shouldExecute: boolean;
  mode: ExecutionMode;
  autonomyLevel: AutonomyLevel;
  reason: string;
}

export async function evaluateToolExecution(
  uid: string,
  toolId: string,
  feature: string
): Promise<EvaluationResult> {
  const mode = await getFeatureMode(uid, feature);
  const autonomyLevel = await getAutonomyLevel(uid);

  if (mode === "manual") {
    return {
      shouldExecute: false,
      mode,
      autonomyLevel,
      reason: "Feature is in manual mode — AI execution disabled",
    };
  }

  if (mode === "auto") {
    const tool = ToolRegistry.get(toolId);
    if (!tool) {
      return {
        shouldExecute: false,
        mode,
        autonomyLevel,
        reason: "Tool not found",
      };
    }

    return {
      shouldExecute: true,
      mode,
      autonomyLevel,
      reason: "Auto mode — executing",
    };
  }

  // ai_assist mode — check autonomy level
  if (autonomyLevel === 0) {
    return {
      shouldExecute: false,
      mode,
      autonomyLevel,
      reason: "Advisory only — no execution",
    };
  }

  return {
    shouldExecute: true,
    mode,
    autonomyLevel,
    reason: "AI Assist mode — executing",
  };
}

export async function evaluateAutoTriggers(uid: string): Promise<Array<{
  ruleId: string;
  toolId: string;
  params: Record<string, unknown>;
  reason: string;
}>> {
  const rules = await getEnabledAutoRules(uid);
  const triggers: Array<{ ruleId: string; toolId: string; params: Record<string, unknown>; reason: string }> = [];

  for (const rule of rules) {
    if (rule.trigger === "schedule" && rule.schedule) {
      if (shouldRunSchedule(rule.schedule, rule.lastRunAt)) {
        triggers.push({
          ruleId: rule.id,
          toolId: rule.toolId,
          params: rule.params,
          reason: `Scheduled: ${rule.schedule}`,
        });
      }
    }
  }

  return triggers;
}

function shouldRunSchedule(schedule: string, lastRunAt: string | null): boolean {
  if (!lastRunAt) return true;

  const lastRun = new Date(lastRunAt);
  const now = new Date();
  const diffMs = now.getTime() - lastRun.getTime();

  // Simple schedule parsing
  if (schedule === "hourly") return diffMs >= 60 * 60 * 1000;
  if (schedule === "daily") return diffMs >= 24 * 60 * 60 * 1000;
  if (schedule === "weekly") return diffMs >= 7 * 24 * 60 * 60 * 1000;

  // Try parsing minutes
  const minMatch = schedule.match(/^(\d+)m(in)?$/);
  if (minMatch) {
    const minutes = parseInt(minMatch[1]);
    return diffMs >= minutes * 60 * 1000;
  }

  // Try parsing hours
  const hourMatch = schedule.match(/^(\d+)h(r)?$/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1]);
    return diffMs >= hours * 60 * 60 * 1000;
  }

  return false;
}

// ─── Map tool to feature ────────────────────────────────────────────────────

export function toolIdToFeature(toolId: string): string {
  const featureMap: Record<string, string> = {
    search_products: "products",
    analyze_product: "products",
    validate_product: "products",
    compare_products: "products",
    save_product: "products",
    remove_product: "products",
    get_product_details: "products",
    find_similar_products: "products",
    check_availability: "products",
    get_product_reviews: "products",
    track_product_price: "products",
    set_price_alert: "products",
    analyze_niche: "products",
    get_trending_products: "products",

    search_suppliers: "suppliers",
    compare_suppliers: "suppliers",
    set_default_supplier: "suppliers",
    get_supplier_performance: "suppliers",
    get_supplier_scorecard: "suppliers",
    send_supplier_message: "suppliers",
    track_negotiation: "suppliers",
    get_supplier_inventory: "suppliers",

    get_orders: "orders",
    route_order: "orders",
    bulk_route_orders: "orders",
    place_order: "orders",
    bulk_place_orders: "orders",
    get_tracking: "orders",
    sync_tracking: "orders",
    get_fulfillment_status: "orders",
    optimize_fulfillment: "orders",
    process_returns: "orders",

    get_profit: "financial",
    get_revenue: "financial",
    calculate_cogs: "financial",
    get_margin: "financial",
    run_pnl_report: "financial",
    run_cashflow_report: "financial",
    calculate_tax: "financial",
    get_cost_breakdown: "financial",
    get_profit_by_product: "financial",
    get_profit_by_platform: "financial",

    push_to_store: "store",
    push_bulk_to_store: "store",
    sync_inventory: "store",
    get_store_products: "store",
    update_store_product: "store",
    remove_store_product: "store",
    get_store_performance: "store",

    get_health_score: "intelligence",
    get_daily_digest: "intelligence",
    get_daily_missions: "intelligence",
    get_recommendations: "intelligence",
    get_market_intel: "intelligence",
    get_competitor_intel: "intelligence",
    get_pricing_intel: "intelligence",
    get_ad_recommendations: "intelligence",
    generate_listing: "intelligence",
    generate_creative: "intelligence",

    monitor_price: "monitoring",
    monitor_stock: "monitoring",
    monitor_competitor: "monitoring",
    get_alerts: "monitoring",
    set_alert: "monitoring",

    compare_shipping_rates: "shipping",
    predict_delivery: "shipping",
    auto_select_shipping: "shipping",
    calculate_customs: "shipping",
    get_shipping_options: "shipping",

    optimize_pricing: "pricing",
    evaluate_price_rule: "pricing",
    calculate_floor_price: "pricing",
  };

  return featureMap[toolId] || "other";
}

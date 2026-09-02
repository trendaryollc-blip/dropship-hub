import type { AutomationPipelineState, AutomationStep, AutomationTrigger, FulfillmentRule } from "@/types/automation";
import { DEFAULT_SLA_CONFIG, DEFAULT_PROFIT_GUARD_CONFIG } from "@/types/automation";
import type { FulfillmentOrder } from "@/types/fulfillment";
import { routeOrder, createRoutingInput } from "./supplier-router";
import { matchRules, shouldAutoApprove, shouldRequireManual, getRouteToSupplierAction } from "./rules-engine";
import { checkProfitMargin } from "./profit-guard";
import { checkInventory } from "./inventory-checker";
import { logAuditEvent } from "./audit-logger";
import { registerForTrackingPolling } from "./auto-tracker";

interface OrchestrationInput {
  uid: string;
  order: FulfillmentOrder;
  trigger: AutomationTrigger;
  rules: FulfillmentRule[];
  supplierInventory: Array<{
    supplierId: string;
    supplierName: string;
    inStock: boolean;
    stockLevel: number;
    unitCost: number;
    shippingCost: number;
    shippingDays: number;
    reliabilityScore: number;
    qualityScore: number;
  }>;
  settings: {
    autoApprove?: Record<string, boolean>;
    optimization?: "speed" | "cost" | "balanced";
    maxShippingDays?: number;
    minReliabilityScore?: number;
  };
}

interface OrchestrationResult {
  state: AutomationPipelineState;
  action: "auto_fulfilled" | "placed_order" | "needs_manual" | "rejected" | "failed";
  message: string;
}

function createPipelineState(orderId: string, trigger: AutomationTrigger): AutomationPipelineState {
  const steps: AutomationStep[] = [
    { name: "detect_order", status: "pending", startedAt: null, completedAt: null, error: null, data: {} },
    { name: "match_rules", status: "pending", startedAt: null, completedAt: null, error: null, data: {} },
    { name: "check_inventory", status: "pending", startedAt: null, completedAt: null, error: null, data: {} },
    { name: "route_supplier", status: "pending", startedAt: null, completedAt: null, error: null, data: {} },
    { name: "validate_profit", status: "pending", startedAt: null, completedAt: null, error: null, data: {} },
    { name: "place_order", status: "pending", startedAt: null, completedAt: null, error: null, data: {} },
    { name: "register_tracking", status: "pending", startedAt: null, completedAt: null, error: null, data: {} },
  ];

  return {
    orderId,
    status: "detecting",
    trigger,
    currentStep: "detect_order",
    selectedSupplier: null,
    cjOrderId: null,
    trackingNumber: null,
    carrier: null,
    error: null,
    retryCount: 0,
    maxRetries: 3,
    startedAt: new Date().toISOString(),
    completedAt: null,
    updatedAt: new Date().toISOString(),
    steps,
  };
}

function updateStep(state: AutomationPipelineState, stepName: string, update: Partial<AutomationStep>): AutomationPipelineState {
  const steps = state.steps.map((s) =>
    s.name === stepName ? { ...s, ...update } : s
  );
  return { ...state, steps, updatedAt: new Date().toISOString() };
}

function completeStep(state: AutomationPipelineState, stepName: string): AutomationPipelineState {
  return updateStep(state, stepName, {
    status: "completed",
    completedAt: new Date().toISOString(),
  });
}

function failStep(state: AutomationPipelineState, stepName: string, error: string): AutomationPipelineState {
  return updateStep(state, stepName, {
    status: "failed",
    error,
    completedAt: new Date().toISOString(),
  });
}

function startStep(state: AutomationPipelineState, stepName: string): AutomationPipelineState {
  return {
    ...updateStep(state, stepName, {
      status: "running",
      startedAt: new Date().toISOString(),
    }),
    currentStep: stepName,
  };
}

export async function orchestrateOrder(input: OrchestrationInput): Promise<OrchestrationResult> {
  let state = createPipelineState(input.order.id, input.trigger);

  logAuditEvent(input.uid, {
    orderId: input.order.id,
    action: "order_detected",
    details: `Order detected via ${input.trigger} from ${input.order.storePlatform}`,
    metadata: { storeOrderId: input.order.storeOrderId, totalRevenue: input.order.totalRevenue },
  });

  state = startStep(state, "detect_order");
  state = completeStep(state, "detect_order");
  state = { ...state, status: "routing" };

  state = startStep(state, "match_rules");
  const ruleContext = {
    supplierId: input.order.items[0]?.supplierId,
    supplierReliability: input.supplierInventory.find((s) => s.supplierId === input.order.items[0]?.supplierId)?.reliabilityScore,
    orderTotal: input.order.totalRevenue,
    customerCountry: input.order.shippingAddress?.country,
    storePlatform: input.order.storePlatform,
    productCost: input.order.items[0]?.unitCost,
    stockLevel: input.supplierInventory.find((s) => s.supplierId === input.order.items[0]?.supplierId)?.stockLevel,
    profitMargin: input.order.totalRevenue > 0 ? ((input.order.totalRevenue - input.order.totalCost) / input.order.totalRevenue) * 100 : 0,
  };

  const ruleResult = matchRules(input.rules, ruleContext);
  state = completeStep(state, "match_rules");

  if (ruleResult.matchedRule) {
    logAuditEvent(input.uid, {
      orderId: input.order.id,
      action: "order_routed",
      details: `Matched rule: ${ruleResult.matchedRule.name}`,
      metadata: { ruleId: ruleResult.matchedRule.id, ruleName: ruleResult.matchedRule.name },
    });
  }

  if (shouldRequireManual(ruleResult.actions)) {
    state = { ...state, status: "needs_manual" };
    state.completedAt = new Date().toISOString();

    logAuditEvent(input.uid, {
      orderId: input.order.id,
      action: "order_approved",
      details: "Rule requires manual review",
      metadata: { ruleId: ruleResult.matchedRule?.id },
    });

    return { state, action: "needs_manual", message: "Rule requires manual review" };
  }

  state = startStep(state, "check_inventory");
  const primarySupplier = input.order.items[0]?.supplierId || "cj";
  const inventory = await checkInventory(primarySupplier, input.order.items[0]?.productId || "");
  state = completeStep(state, "check_inventory");

  if (!inventory.inStock) {
    logAuditEvent(input.uid, {
      orderId: input.order.id,
      action: "inventory_unavailable",
      details: `Primary supplier ${primarySupplier} out of stock`,
      metadata: { supplierId: primarySupplier, stockLevel: inventory.stockLevel },
    });
  }

  state = startStep(state, "route_supplier");
  const routingInput = createRoutingInput(
    input.order,
    input.supplierInventory,
    input.settings.optimization || "balanced",
    {
      maxShippingDays: input.settings.maxShippingDays,
      minReliability: input.settings.minReliabilityScore,
    }
  );
  const routing = routeOrder(routingInput);
  state = {
    ...state,
    selectedSupplier: routing.selectedSupplier.supplierId,
    status: "routing",
  };
  state = completeStep(state, "route_supplier");

  const routeAction = getRouteToSupplierAction(ruleResult.actions);
  if (routeAction) {
    const ruleSupplier = String(routeAction.params.supplierId);
    const ruleSupplierData = input.supplierInventory.find((s) => s.supplierId === ruleSupplier);
    if (ruleSupplierData) {
      routing.selectedSupplier = {
        ...routing.selectedSupplier,
        supplierId: ruleSupplier,
        supplierName: ruleSupplierData.supplierName,
        unitCost: ruleSupplierData.unitCost,
        shippingCost: ruleSupplierData.shippingCost,
        totalCost: ruleSupplierData.unitCost + ruleSupplierData.shippingCost,
        shippingDays: ruleSupplierData.shippingDays,
        reliabilityScore: ruleSupplierData.reliabilityScore,
      };
      state.selectedSupplier = ruleSupplier;
    }
  }

  logAuditEvent(input.uid, {
    orderId: input.order.id,
    action: "order_routed",
    details: routing.reason,
    metadata: {
      selectedSupplier: routing.selectedSupplier.supplierId,
      totalCost: routing.selectedSupplier.totalCost,
      shippingDays: routing.selectedSupplier.shippingDays,
    },
  });

  state = startStep(state, "validate_profit");
  const profitResult = checkProfitMargin({
    revenue: input.order.totalRevenue,
    unitCost: routing.selectedSupplier.unitCost,
    shippingCost: routing.selectedSupplier.shippingCost,
    quantity: input.order.items.reduce((sum, item) => sum + item.quantity, 0),
  });
  state = completeStep(state, "validate_profit");

  if (!profitResult.passed) {
    logAuditEvent(input.uid, {
      orderId: input.order.id,
      action: "profit_rejected",
      details: profitResult.reason,
      metadata: { profit: profitResult.profit, margin: profitResult.profitMargin },
    });

    state = { ...state, status: "failed", error: profitResult.reason };
    state.completedAt = new Date().toISOString();
    return { state, action: "rejected", message: profitResult.reason };
  }

  const isAutoApprove = input.settings.autoApprove?.[routing.selectedSupplier.supplierId] ||
    shouldAutoApprove(ruleResult.actions);

  if (!isAutoApprove) {
    state = { ...state, status: "needs_manual" };
    state.completedAt = new Date().toISOString();

    logAuditEvent(input.uid, {
      orderId: input.order.id,
      action: "order_approved",
      details: "Auto-approval not enabled for this supplier",
      metadata: { supplierId: routing.selectedSupplier.supplierId },
    });

    return { state, action: "needs_manual", message: "Auto-approval not enabled for this supplier" };
  }

  state = startStep(state, "place_order");
  state = { ...state, status: "placing_order" };

  const isCJ = routing.selectedSupplier.supplierId === "cj";
  if (isCJ) {
    try {
      const { placeCJOrder } = await import("./cj-adapter");
      const result = await placeCJOrder({
        productId: input.order.items[0]?.productId || "",
        quantity: input.order.items.reduce((sum, item) => sum + item.quantity, 0),
        shippingAddress: input.order.shippingAddress,
      });

      if (result.success && result.orderId) {
        state = { ...state, cjOrderId: result.orderId };
        state = completeStep(state, "place_order");

        logAuditEvent(input.uid, {
          orderId: input.order.id,
          action: "order_placed",
          details: `CJ order placed: ${result.orderId}`,
          metadata: { cjOrderNumber: result.orderId, estimatedDelivery: result.estimatedDelivery },
        });
      } else {
        throw new Error(result.error || "CJ order failed");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Order placement failed";
      state = failStep(state, "place_order", errorMsg);
      state = { ...state, status: "failed", error: errorMsg };
      state.completedAt = new Date().toISOString();

      logAuditEvent(input.uid, {
        orderId: input.order.id,
        action: "order_failed",
        details: errorMsg,
        metadata: { supplierId: routing.selectedSupplier.supplierId, error: errorMsg },
      });

      return { state, action: "failed", message: errorMsg };
    }
  } else {
    state = completeStep(state, "place_order");
    logAuditEvent(input.uid, {
      orderId: input.order.id,
      action: "order_placed",
      details: `Order queued for manual placement with ${routing.selectedSupplier.supplierName}`,
      metadata: { supplierId: routing.selectedSupplier.supplierId },
    });
  }

  state = startStep(state, "register_tracking");
  if (isCJ && state.cjOrderId) {
    registerForTrackingPolling(input.order.id, state.cjOrderId);
  }
  state = completeStep(state, "register_tracking");

  state = { ...state, status: "completed" };
  state.completedAt = new Date().toISOString();

  return {
    state,
    action: isCJ ? "placed_order" : "auto_fulfilled",
    message: isCJ
      ? `Order placed with CJ: ${state.cjOrderId}`
      : `Order routed to ${routing.selectedSupplier.supplierName}`,
  };
}

export function createOrchestrationInput(
  uid: string,
  order: FulfillmentOrder,
  trigger: AutomationTrigger,
  rules: FulfillmentRule[],
  supplierInventory: OrchestrationInput["supplierInventory"],
  settings: OrchestrationInput["settings"]
): OrchestrationInput {
  return { uid, order, trigger, rules, supplierInventory, settings };
}

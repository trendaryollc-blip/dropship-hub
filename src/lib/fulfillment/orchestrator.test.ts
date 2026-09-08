import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FulfillmentOrder } from "@/types/fulfillment";
import type { FulfillmentRule, AutomationTrigger } from "@/types/automation";

vi.mock("./supplier-router", () => ({
  routeOrder: vi.fn(),
  createRoutingInput: vi.fn(),
}));

vi.mock("./rules-engine", () => ({
  matchRules: vi.fn(),
  shouldAutoApprove: vi.fn(),
  shouldRequireManual: vi.fn(),
  getRouteToSupplierAction: vi.fn(),
}));

vi.mock("./profit-guard", () => ({
  checkProfitMargin: vi.fn(),
}));

vi.mock("./inventory-checker", () => ({
  checkInventory: vi.fn(),
}));

vi.mock("./audit-logger", () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock("./auto-tracker", () => ({
  registerForTrackingPolling: vi.fn(),
}));

vi.mock("./cj-adapter", () => ({
  placeCJOrder: vi.fn().mockResolvedValue({
    success: true,
    orderId: "cj-123",
    estimatedDelivery: "2025-01-20",
  }),
}));

import { orchestrateOrder, createOrchestrationInput } from "./orchestrator";
import { routeOrder, createRoutingInput } from "./supplier-router";
import { matchRules, shouldAutoApprove, shouldRequireManual, getRouteToSupplierAction } from "./rules-engine";
import { checkProfitMargin } from "./profit-guard";
import { checkInventory } from "./inventory-checker";
import { logAuditEvent } from "./audit-logger";
import { registerForTrackingPolling } from "./auto-tracker";
import { placeCJOrder } from "./cj-adapter";

function createMockOrder(): FulfillmentOrder {
  return {
    id: "order-1",
    trendaryoOrderId: "td-1",
    storeOrderId: "store-1",
    storePlatform: "shopify",
    orderNumber: "ORD-001",
    items: [
      {
        productId: "p1",
        name: "Widget",
        price: 29.99,
        quantity: 1,
        source: "cj",
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        imageUrl: "https://example.com/img.jpg",
        platformProductId: "sp-1",
        unitCost: 5,
      },
    ],
    customerName: "John",
    customerEmail: "john@test.com",
    shippingAddress: {
      fullName: "John",
      email: "john@test.com",
      phone: "555",
      street: "123 Main",
      city: "NYC",
      state: "NY",
      zipCode: "10001",
      country: "US",
    },
    status: "pending",
    platformOrders: [],
    totalRevenue: 29.99,
    totalCost: 8,
    profit: 21.99,
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
  };
}

const mockRuleResult = {
  matchedRule: { id: "r1", name: "Default" },
  actions: [],
  fallbackAction: null,
};

const mockRoutingResult = {
  selectedSupplier: {
    supplierId: "cj",
    supplierName: "CJ Dropshipping",
    unitCost: 5,
    shippingCost: 3,
    totalCost: 8,
    shippingDays: 7,
    reliabilityScore: 90,
    inStock: true,
    stockLevel: 100,
    qualityScore: 85,
    totalScore: 88,
  },
  reason: "Best value",
  orderId: "order-1",
  alternatives: [],
  routedAt: "2025-01-15T10:00:01Z",
  ruleId: null,
  trigger: "webhook" as AutomationTrigger,
};

const mockRoutingInput = {
  order: createMockOrder(),
  supplierInventory: [],
  optimization: "balanced" as const,
  maxShippingDays: 15,
  minReliability: 80,
  preferLocalWarehouse: false,
};

const mockProfitResult = {
  passed: true,
  profit: 15,
  profitMargin: 30,
  reason: "",
  details: { revenue: 29.99, totalCost: 8 },
};

const mockInventoryResult = {
  supplierId: "cj",
  productId: "p1",
  inStock: true,
  stockLevel: 100,
  lastChecked: "2025-01-15T10:00:00Z",
};

function buildInput(overrides?: { rules?: FulfillmentRule[]; autoApprove?: Record<string, boolean> }) {
  return {
    uid: "user-1",
    order: createMockOrder(),
    trigger: "webhook" as AutomationTrigger,
    rules: overrides?.rules ?? [
      {
        id: "r1",
        name: "Default",
        description: "Default rule",
        enabled: true,
        priority: 1,
        conditions: [],
        actions: [],
        fallbackAction: null,
        createdAt: "2025-01-15T10:00:00Z",
        updatedAt: "2025-01-15T10:00:00Z",
      },
    ],
    supplierInventory: [
      {
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        inStock: true,
        stockLevel: 100,
        unitCost: 5,
        shippingCost: 3,
        shippingDays: 7,
        reliabilityScore: 90,
        qualityScore: 85,
      },
    ],
    settings: {
      autoApprove: overrides?.autoApprove ?? { cj: true },
      optimization: "balanced" as const,
      maxShippingDays: 15,
      minReliabilityScore: 80,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(matchRules).mockReturnValue(mockRuleResult);
  vi.mocked(shouldRequireManual).mockReturnValue(false);
  vi.mocked(shouldAutoApprove).mockReturnValue(true);
  vi.mocked(getRouteToSupplierAction).mockReturnValue(null);
  vi.mocked(routeOrder).mockReturnValue(mockRoutingResult);
  vi.mocked(createRoutingInput).mockReturnValue(mockRoutingInput);
  vi.mocked(checkProfitMargin).mockReturnValue(mockProfitResult);
  vi.mocked(checkInventory).mockResolvedValue(mockInventoryResult);
  vi.mocked(logAuditEvent).mockImplementation(() => {});
  vi.mocked(registerForTrackingPolling).mockImplementation(() => {});
  vi.mocked(placeCJOrder).mockResolvedValue({
    success: true,
    orderId: "cj-123",
    estimatedDelivery: "2025-01-20",
  });
});

describe("orchestrateOrder", () => {
  it("returns needs_manual when shouldRequireManual returns true", async () => {
    vi.mocked(shouldRequireManual).mockReturnValue(true);

    const result = await orchestrateOrder(buildInput());

    expect(result.action).toBe("needs_manual");
    expect(result.state.status).toBe("needs_manual");
    expect(result.message).toBe("Rule requires manual review");
    expect(vi.mocked(logAuditEvent)).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ action: "order_approved" })
    );
  });

  it("returns rejected when profit check fails", async () => {
    vi.mocked(checkProfitMargin).mockReturnValue({
      passed: false,
      profit: -2,
      profitMargin: -5,
      reason: "Profit margin too low",
      details: { revenue: 29.99, totalCost: 32 },
    });

    const result = await orchestrateOrder(buildInput());

    expect(result.action).toBe("rejected");
    expect(result.state.status).toBe("failed");
    expect(result.message).toBe("Profit margin too low");
    expect(vi.mocked(logAuditEvent)).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ action: "profit_rejected" })
    );
  });

  it("returns needs_manual when auto-approve is not enabled", async () => {
    vi.mocked(shouldAutoApprove).mockReturnValue(false);

    const result = await orchestrateOrder(buildInput({ autoApprove: {} }));

    expect(result.action).toBe("needs_manual");
    expect(result.state.status).toBe("needs_manual");
    expect(result.message).toBe("Auto-approval not enabled for this supplier");
    expect(vi.mocked(logAuditEvent)).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ action: "order_approved" })
    );
  });

  it("returns placed_order for CJ supplier with successful order", async () => {
    const result = await orchestrateOrder(buildInput());

    expect(result.action).toBe("placed_order");
    expect(result.state.status).toBe("completed");
    expect(result.state.cjOrderId).toBe("cj-123");
    expect(result.message).toContain("CJ");
    expect(vi.mocked(placeCJOrder)).toHaveBeenCalledWith({
      productId: "p1",
      quantity: 1,
      shippingAddress: expect.objectContaining({ fullName: "John" }),
    });
    expect(vi.mocked(logAuditEvent)).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ action: "order_placed" })
    );
  });

  it("returns auto_fulfilled for non-CJ supplier", async () => {
    vi.mocked(routeOrder).mockReturnValue({
      ...mockRoutingResult,
      selectedSupplier: {
        ...mockRoutingResult.selectedSupplier,
        supplierId: "aliexpress",
        supplierName: "AliExpress",
      },
    });

    const result = await orchestrateOrder(buildInput());

    expect(result.action).toBe("auto_fulfilled");
    expect(result.state.status).toBe("completed");
    expect(result.state.selectedSupplier).toBe("aliexpress");
    expect(result.message).toContain("AliExpress");
  });

  it("returns failed when CJ order placement fails", async () => {
    vi.mocked(placeCJOrder).mockResolvedValue({
      success: false,
      error: "Payment declined",
    });

    const result = await orchestrateOrder(buildInput());

    expect(result.action).toBe("failed");
    expect(result.state.status).toBe("failed");
    expect(result.message).toBe("Payment declined");
    expect(vi.mocked(logAuditEvent)).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ action: "order_failed" })
    );
  });

  it("calls logAuditEvent at each step", async () => {
    await orchestrateOrder(buildInput());

    const actions = vi.mocked(logAuditEvent).mock.calls.map((call) => call[1].action);

    expect(actions).toContain("order_detected");
    expect(actions).toContain("order_routed");
    expect(actions).toContain("order_placed");
  });

  it("calls registerForTrackingPolling for CJ orders", async () => {
    await orchestrateOrder(buildInput());

    expect(vi.mocked(registerForTrackingPolling)).toHaveBeenCalledWith("order-1", "cj-123");
  });
});

describe("createOrchestrationInput", () => {
  it("returns the input object with all fields", () => {
    const order = createMockOrder();
    const rules: FulfillmentRule[] = [];
    const supplierInventory = [{ supplierId: "cj", supplierName: "CJ Dropshipping", inStock: true, stockLevel: 100, unitCost: 5, shippingCost: 3, shippingDays: 7, reliabilityScore: 90, qualityScore: 85 }];
    const settings = { autoApprove: { cj: true }, optimization: "balanced" as const };

    const result = createOrchestrationInput("user-1", order, "webhook", rules, supplierInventory, settings);

    expect(result.uid).toBe("user-1");
    expect(result.order).toBe(order);
    expect(result.trigger).toBe("webhook");
    expect(result.rules).toBe(rules);
    expect(result.supplierInventory).toBe(supplierInventory);
    expect(result.settings).toBe(settings);
  });
});

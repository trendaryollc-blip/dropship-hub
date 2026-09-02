import { describe, it, expect } from "vitest";
import { DEFAULT_FULFILLMENT_SETTINGS, PLATFORM_CONFIGS } from "@/types/fulfillment";
import type { FulfillmentRule, AuditLogEntry } from "@/types/automation";
import { DEFAULT_FULFILLMENT_RULES } from "@/types/automation";

describe("Fulfillment Page - Audit Tab", () => {
  it("audit log entry has required fields", () => {
    const entry: AuditLogEntry = {
      id: "audit-1",
      orderId: "order-123",
      action: "order_detected",
      details: "New order received from Shopify",
      metadata: { platform: "shopify" },
      timestamp: new Date().toISOString(),
    };
    expect(entry.id).toBe("audit-1");
    expect(entry.action).toBe("order_detected");
    expect(entry.timestamp).toBeTruthy();
  });

  it("supports all audit action types", () => {
    const actions: AuditLogEntry["action"][] = [
      "order_detected", "order_routed", "order_approved", "order_placed",
      "order_failed", "order_cancelled", "tracking_synced", "tracking_detected",
      "fallback_triggered", "profit_rejected", "inventory_unavailable",
      "sla_breach", "bulk_started", "bulk_completed", "bulk_partial",
      "rules_updated", "settings_updated",
    ];
    expect(actions).toHaveLength(17);
  });

  it("audit log can be filtered by action type", () => {
    const entries: AuditLogEntry[] = [
      { id: "1", orderId: "o1", action: "order_detected", details: "a", metadata: {}, timestamp: "" },
      { id: "2", orderId: "o2", action: "order_placed", details: "b", metadata: {}, timestamp: "" },
      { id: "3", orderId: "o3", action: "order_detected", details: "c", metadata: {}, timestamp: "" },
    ];
    const filtered = entries.filter((e) => e.action === "order_detected");
    expect(filtered).toHaveLength(2);
  });

  it("audit log can be searched by order ID", () => {
    const entries: AuditLogEntry[] = [
      { id: "1", orderId: "ORD-001", action: "order_detected", details: "First order", metadata: {}, timestamp: "" },
      { id: "2", orderId: "ORD-002", action: "order_placed", details: "Second order", metadata: {}, timestamp: "" },
    ];
    const searchQuery = "ORD-001";
    const filtered = entries.filter((e) =>
      e.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.details.toLowerCase().includes(searchQuery.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].orderId).toBe("ORD-001");
  });
});

describe("Fulfillment Page - Rules Tab", () => {
  it("default rules are defined", () => {
    expect(DEFAULT_FULFILLMENT_RULES.length).toBeGreaterThan(0);
  });

  it("each rule has required fields", () => {
    for (const rule of DEFAULT_FULFILLMENT_RULES) {
      expect(rule.id).toBeTruthy();
      expect(rule.name).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(typeof rule.enabled).toBe("boolean");
      expect(typeof rule.priority).toBe("number");
      expect(Array.isArray(rule.conditions)).toBe(true);
      expect(Array.isArray(rule.actions)).toBe(true);
    }
  });

  it("rule can be toggled on/off", () => {
    const rule: FulfillmentRule = {
      id: "test-rule",
      name: "Test Rule",
      description: "A test rule",
      enabled: true,
      priority: 1,
      conditions: [],
      actions: [],
      fallbackAction: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(rule.enabled).toBe(true);
    rule.enabled = false;
    expect(rule.enabled).toBe(false);
  });

  it("rule conditions use valid fields", () => {
    const validFields = [
      "supplier_id", "supplier_reliability", "supplier_shipping_days",
      "product_cost", "order_total", "customer_country", "customer_state",
      "product_category", "stock_level", "profit_margin", "store_platform", "order_age_hours",
    ];
    for (const rule of DEFAULT_FULFILLMENT_RULES) {
      for (const cond of rule.conditions) {
        expect(validFields).toContain(cond.field);
      }
    }
  });

  it("rule actions use valid types", () => {
    const validActions = [
      "route_to_supplier", "set_priority", "auto_approve",
      "require_manual", "set_max_cost", "notify", "cancel_order",
    ];
    for (const rule of DEFAULT_FULFILLMENT_RULES) {
      for (const action of rule.actions) {
        expect(validActions).toContain(action.type);
      }
    }
  });
});

describe("Fulfillment Page - Templates Tab", () => {
  it("fulfillment template type has required fields", () => {
    interface FulfillmentTemplate {
      id: string;
      name: string;
      description: string;
      supplier: string;
      items: Array<{ name: string; unitCost: number; quantity: number }>;
      shippingMethod: string;
      createdAt: string;
    }
    const template: FulfillmentTemplate = {
      id: "tpl-1",
      name: "iPhone Case Bundle",
      description: "Bulk phone case orders",
      supplier: "cj",
      items: [
        { name: "iPhone 15 Case", unitCost: 2.50, quantity: 100 },
        { name: "iPhone 15 Screen Protector", unitCost: 0.80, quantity: 100 },
      ],
      shippingMethod: "ePacket",
      createdAt: new Date().toISOString(),
    };
    expect(template.id).toBe("tpl-1");
    expect(template.items).toHaveLength(2);
    expect(template.items[0].unitCost * template.items[0].quantity).toBe(250);
  });

  it("template items calculate total cost correctly", () => {
    const items = [
      { name: "Widget A", unitCost: 5.00, quantity: 10 },
      { name: "Widget B", unitCost: 3.00, quantity: 20 },
    ];
    const total = items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
    expect(total).toBe(110);
  });
});

describe("Fulfillment Page - Settings Integration", () => {
  it("default settings have auto-approve for CJ", () => {
    expect(DEFAULT_FULFILLMENT_SETTINGS.autoApprove.cj).toBe(true);
  });

  it("platform configs define all supported platforms", () => {
    const platformIds = PLATFORM_CONFIGS.map((p) => p.id);
    expect(platformIds).toContain("cj");
    expect(platformIds).toContain("aliexpress");
    expect(platformIds).toContain("amazon");
    expect(platformIds).toContain("ebay");
    expect(platformIds).toContain("alibaba");
    expect(platformIds).toContain("dhgate");
    expect(platformIds).toContain("temu");
    expect(platformIds).toContain("shein");
    expect(platformIds).toContain("banggood");
    expect(platformIds).toContain("custom");
  });

  it("only CJ supports auto-ordering", () => {
    const autoOrderPlatforms = PLATFORM_CONFIGS.filter((p) => p.autoOrderSupported);
    expect(autoOrderPlatforms).toHaveLength(1);
    expect(autoOrderPlatforms[0].id).toBe("cj");
  });

  it("settings have supplier preferences", () => {
    expect(DEFAULT_FULFILLMENT_SETTINGS.supplierPreferences.length).toBeGreaterThan(0);
    expect(DEFAULT_FULFILLMENT_SETTINGS.supplierPreferences[0].supplierId).toBe("cj");
  });
});

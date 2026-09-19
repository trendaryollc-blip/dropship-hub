import { describe, it, expect } from "vitest";
import { DEFAULT_FULFILLMENT_RULES } from "@/types/automation";
import { DEFAULT_FULFILLMENT_SETTINGS, PLATFORM_CONFIGS } from "@/types/fulfillment";

describe("fulfillment rules and platform config", () => {
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

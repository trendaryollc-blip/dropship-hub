import { describe, it, expect } from "vitest";
import { WORKFLOW_TEMPLATES, getWorkflowTemplate, getWorkflowTemplates, getTemplateCategories } from "./templates";

describe("Workflow Templates", () => {
  describe("WORKFLOW_TEMPLATES", () => {
    it("contains 8 workflow templates", () => {
      expect(WORKFLOW_TEMPLATES.length).toBe(8);
    });

    it("each template has required fields", () => {
      WORKFLOW_TEMPLATES.forEach((template) => {
        expect(template).toHaveProperty("id");
        expect(template).toHaveProperty("name");
        expect(template).toHaveProperty("description");
        expect(template).toHaveProperty("steps");
        expect(Array.isArray(template.steps)).toBe(true);
        expect(template.steps.length).toBeGreaterThan(0);
      });
    });

    it("each step has required fields", () => {
      WORKFLOW_TEMPLATES.forEach((template) => {
        template.steps.forEach((step) => {
          expect(step).toHaveProperty("toolId");
          expect(step).toHaveProperty("inputMapping");
          expect(typeof step.inputMapping).toBe("object");
        });
      });
    });

    it("includes product_launch workflow", () => {
      const template = getWorkflowTemplate("product_launch");
      expect(template).toBeDefined();
      expect(template?.name).toBe("Product Launch Pipeline");
      expect(template?.steps.length).toBe(5);
    });

    it("includes fulfill_order workflow", () => {
      const template = getWorkflowTemplate("fulfill_order");
      expect(template).toBeDefined();
      expect(template?.name).toBe("Order Fulfillment Flow");
    });

    it("includes daily_health_check workflow", () => {
      const template = getWorkflowTemplate("daily_health_check");
      expect(template).toBeDefined();
      expect(template?.name).toBe("Daily Business Health Check");
    });

    it("includes price_optimization workflow", () => {
      const template = getWorkflowTemplate("price_optimization");
      expect(template).toBeDefined();
    });

    it("includes supplier_comparison workflow", () => {
      const template = getWorkflowTemplate("supplier_comparison");
      expect(template).toBeDefined();
    });

    it("includes shipping_optimization workflow", () => {
      const template = getWorkflowTemplate("shipping_optimization");
      expect(template).toBeDefined();
    });

    it("includes inventory_sync_alert workflow", () => {
      const template = getWorkflowTemplate("inventory_sync_alert");
      expect(template).toBeDefined();
    });

    it("includes bulk_order_processing workflow", () => {
      const template = getWorkflowTemplate("bulk_order_processing");
      expect(template).toBeDefined();
    });
  });

  describe("getWorkflowTemplate", () => {
    it("returns template by id", () => {
      const template = getWorkflowTemplate("product_launch");
      expect(template).toBeDefined();
      expect(template?.id).toBe("product_launch");
    });

    it("returns undefined for non-existent id", () => {
      const template = getWorkflowTemplate("nonexistent_workflow");
      expect(template).toBeUndefined();
    });
  });

  describe("getWorkflowTemplates", () => {
    it("returns all templates", () => {
      const templates = getWorkflowTemplates();
      expect(templates.length).toBe(8);
    });
  });

  describe("getTemplateCategories", () => {
    it("returns category list", () => {
      const categories = getTemplateCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain("Product Launch");
      expect(categories).toContain("Fulfillment");
      expect(categories).toContain("Shipping");
    });
  });
});

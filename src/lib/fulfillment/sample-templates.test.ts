import { describe, it, expect, beforeEach } from "vitest";
import {
  createTemplate,
  getTemplate,
  getAllTemplates,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  validateTemplate,
  getTemplateStats,
} from "./sample-templates";
import type { SampleOrderTemplate } from "./sample-templates";

describe("Sample Templates", () => {
  beforeEach(() => {
    const templates = getAllTemplates();
    for (const template of templates) {
      deleteTemplate(template.id);
    }
  });

  describe("createTemplate", () => {
    it("creates a new template", () => {
      const template = createTemplate({
        name: "Test Template",
        description: "A test template",
        products: [
          {
            productId: "P1",
            productTitle: "Product 1",
            productPrice: 9.99,
            source: "cj",
            quantity: 1,
          },
        ],
        shippingAddress: {
          fullName: "Test User",
          phone: "555-0000",
          street: "123 Test St",
          city: "Testville",
          state: "TS",
          zipCode: "12345",
          country: "US",
        },
        autoTrack: true,
        notifyOnDelivery: false,
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe("Test Template");
      expect(template.products.length).toBe(1);
      expect(template.usageCount).toBe(0);
    });
  });

  describe("getTemplate", () => {
    it("retrieves a template by ID", () => {
      const created = createTemplate({
        name: "Test Template",
        description: "A test template",
        products: [],
        shippingAddress: {
          fullName: "Test User",
          phone: "555-0000",
          street: "123 Test St",
          city: "Testville",
          state: "TS",
          zipCode: "12345",
          country: "US",
        },
        autoTrack: true,
        notifyOnDelivery: false,
      });

      const retrieved = getTemplate(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe("Test Template");
    });

    it("returns null for non-existent template", () => {
      const retrieved = getTemplate("non-existent");
      expect(retrieved).toBeNull();
    });
  });

  describe("updateTemplate", () => {
    it("updates a template", () => {
      const created = createTemplate({
        name: "Test Template",
        description: "A test template",
        products: [],
        shippingAddress: {
          fullName: "Test User",
          phone: "555-0000",
          street: "123 Test St",
          city: "Testville",
          state: "TS",
          zipCode: "12345",
          country: "US",
        },
        autoTrack: true,
        notifyOnDelivery: false,
      });

      const updated = updateTemplate(created.id, { name: "Updated Template" });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("Updated Template");
    });

    it("returns null for non-existent template", () => {
      const updated = updateTemplate("non-existent", { name: "Updated" });
      expect(updated).toBeNull();
    });
  });

  describe("deleteTemplate", () => {
    it("deletes a template", () => {
      const created = createTemplate({
        name: "Test Template",
        description: "A test template",
        products: [],
        shippingAddress: {
          fullName: "Test User",
          phone: "555-0000",
          street: "123 Test St",
          city: "Testville",
          state: "TS",
          zipCode: "12345",
          country: "US",
        },
        autoTrack: true,
        notifyOnDelivery: false,
      });

      const deleted = deleteTemplate(created.id);
      expect(deleted).toBe(true);
      expect(getTemplate(created.id)).toBeNull();
    });

    it("returns false for non-existent template", () => {
      const deleted = deleteTemplate("non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("duplicateTemplate", () => {
    it("duplicates a template with new name", () => {
      const created = createTemplate({
        name: "Original Template",
        description: "A test template",
        products: [
          {
            productId: "P1",
            productTitle: "Product 1",
            productPrice: 9.99,
            source: "cj",
            quantity: 1,
          },
        ],
        shippingAddress: {
          fullName: "Test User",
          phone: "555-0000",
          street: "123 Test St",
          city: "Testville",
          state: "TS",
          zipCode: "12345",
          country: "US",
        },
        autoTrack: true,
        notifyOnDelivery: false,
      });

      const duplicated = duplicateTemplate(created.id, "Duplicated Template");
      expect(duplicated).not.toBeNull();
      expect(duplicated!.name).toBe("Duplicated Template");
      expect(duplicated!.products.length).toBe(1);
      expect(duplicated!.id).not.toBe(created.id);
    });

    it("returns null for non-existent template", () => {
      const duplicated = duplicateTemplate("non-existent", "New Name");
      expect(duplicated).toBeNull();
    });
  });

  describe("validateTemplate", () => {
    it("validates correct template", () => {
      const result = validateTemplate({
        name: "Test Template",
        products: [
          {
            productId: "P1",
            productTitle: "Product 1",
            productPrice: 9.99,
            source: "cj",
            quantity: 1,
          },
        ],
        shippingAddress: {
          fullName: "Test User",
          phone: "555-0000",
          street: "123 Test St",
          city: "Testville",
          state: "TS",
          zipCode: "12345",
          country: "US",
        },
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("rejects template without name", () => {
      const result = validateTemplate({
        products: [],
        shippingAddress: {
          fullName: "Test User",
          phone: "555-0000",
          street: "123 Test St",
          city: "Testville",
          state: "TS",
          zipCode: "12345",
          country: "US",
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("name"))).toBe(true);
    });

    it("rejects template without products", () => {
      const result = validateTemplate({
        name: "Test Template",
        products: [],
        shippingAddress: {
          fullName: "Test User",
          phone: "555-0000",
          street: "123 Test St",
          city: "Testville",
          state: "TS",
          zipCode: "12345",
          country: "US",
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("product"))).toBe(true);
    });

    it("rejects template without shipping address", () => {
      const result = validateTemplate({
        name: "Test Template",
        products: [
          {
            productId: "P1",
            productTitle: "Product 1",
            productPrice: 9.99,
            source: "cj",
            quantity: 1,
          },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("address"))).toBe(true);
    });
  });

  describe("getTemplateStats", () => {
    it("returns correct stats", () => {
      createTemplate({
        name: "Template 1",
        description: "",
        products: [
          { productId: "P1", productTitle: "Product 1", productPrice: 9.99, source: "cj", quantity: 1 },
          { productId: "P2", productTitle: "Product 2", productPrice: 19.99, source: "cj", quantity: 1 },
        ],
        shippingAddress: {
          fullName: "Test User",
          phone: "555-0000",
          street: "123 Test St",
          city: "Testville",
          state: "TS",
          zipCode: "12345",
          country: "US",
        },
        autoTrack: true,
        notifyOnDelivery: false,
      });

      const stats = getTemplateStats();
      expect(stats.totalTemplates).toBe(1);
      expect(stats.avgProductsPerTemplate).toBe(2);
    });
  });
});

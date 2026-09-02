import { describe, it, expect } from "vitest";
import {
  routeOrder,
  createRoutingInput,
  selectBestSupplier,
} from "@/lib/fulfillment/supplier-router";
import type { FulfillmentOrder } from "@/types/fulfillment";

const mockOrder: FulfillmentOrder = {
  id: "order_1",
  trendaryoOrderId: "trend_1",
  storeOrderId: "shop_1",
  storePlatform: "shopify",
  storeName: "Test Store",
  orderNumber: "ORD-001",
  items: [
    {
      productId: "prod_1",
      name: "Wireless Earbuds",
      price: 29.99,
      quantity: 2,
      source: "cj",
      supplierId: "cj",
      supplierName: "CJ Dropshipping",
      imageUrl: "https://example.com/img.jpg",
      platformProductId: "CJ123",
      unitCost: 8.5,
    },
  ],
  customerName: "John Doe",
  customerEmail: "john@example.com",
  shippingAddress: {
    fullName: "John Doe",
    email: "john@example.com",
    phone: "1234567890",
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    country: "US",
  },
  status: "pending",
  platformOrders: [],
  totalRevenue: 59.98,
  totalCost: 17,
  profit: 42.98,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockSuppliers = [
  {
    supplierId: "cj",
    supplierName: "CJ Dropshipping",
    inStock: true,
    stockLevel: 500,
    unitCost: 12.99,
    shippingCost: 5.99,
    shippingDays: 12,
    reliabilityScore: 85,
    qualityScore: 80,
  },
  {
    supplierId: "aliexpress",
    supplierName: "AliExpress",
    inStock: true,
    stockLevel: 200,
    unitCost: 5.99,
    shippingCost: 2.99,
    shippingDays: 18,
    reliabilityScore: 85,
    qualityScore: 80,
  },
  {
    supplierId: "amazon",
    supplierName: "Amazon",
    inStock: true,
    stockLevel: 50,
    unitCost: 15.99,
    shippingCost: 0,
    shippingDays: 3,
    reliabilityScore: 95,
    qualityScore: 90,
  },
];

describe("Supplier Router", () => {
  describe("routeOrder", () => {
    it("routes to cheapest supplier when optimizing for cost", () => {
      const cheapAliExpress = [
        { ...mockSuppliers[0], supplierId: "cj" },
        { ...mockSuppliers[1], supplierId: "aliexpress", unitCost: 3.99, shippingCost: 1.99, shippingDays: 10, reliabilityScore: 85 },
        { ...mockSuppliers[2], supplierId: "amazon" },
      ];
      const input = createRoutingInput(mockOrder, cheapAliExpress, "cost");
      const result = routeOrder(input);
      expect(result.selectedSupplier.supplierId).toBe("aliexpress");
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.reason).toContain("lowest cost");
    });

    it("routes to fastest supplier when optimizing for speed", () => {
      const input = createRoutingInput(mockOrder, mockSuppliers, "speed");
      const result = routeOrder(input);
      expect(result.selectedSupplier.supplierId).toBe("amazon");
      expect(result.reason).toContain("fastest shipping");
    });

    it("routes to best balance when optimizing for balanced", () => {
      const input = createRoutingInput(mockOrder, mockSuppliers, "balanced");
      const result = routeOrder(input);
      expect(result.selectedSupplier).toBeDefined();
      expect(result.selectedSupplier.totalScore).toBeGreaterThan(0);
    });

    it("excludes out-of-stock suppliers", () => {
      const suppliers = [
        { ...mockSuppliers[0], inStock: false, stockLevel: 0 },
        { ...mockSuppliers[1], shippingDays: 10 },
      ];
      const input = createRoutingInput(mockOrder, suppliers, "cost");
      const result = routeOrder(input);
      expect(result.selectedSupplier.supplierId).not.toBe("cj");
    });

    it("excludes suppliers below minimum reliability", () => {
      const suppliers = [
        { ...mockSuppliers[0], reliabilityScore: 50 },
        { ...mockSuppliers[1], shippingDays: 10 },
      ];
      const input = createRoutingInput(mockOrder, suppliers, "cost", { minReliability: 80 });
      const result = routeOrder(input);
      expect(result.selectedSupplier.supplierId).not.toBe("cj");
    });

    it("excludes suppliers exceeding max shipping days", () => {
      const suppliers = [
        { ...mockSuppliers[0], shippingDays: 40 },
        mockSuppliers[1],
      ];
      const input = createRoutingInput(mockOrder, suppliers, "cost", { maxShippingDays: 30 });
      const result = routeOrder(input);
      expect(result.selectedSupplier.supplierId).not.toBe("cj");
    });

    it("returns manual fallback when no suppliers available", () => {
      const input = createRoutingInput(mockOrder, [], "cost");
      const result = routeOrder(input);
      expect(result.selectedSupplier.supplierId).toBe("manual");
      expect(result.reason).toContain("No suppliers available");
    });

    it("populates alternatives list", () => {
      const input = createRoutingInput(mockOrder, mockSuppliers, "balanced");
      const result = routeOrder(input);
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives.length).toBeLessThanOrEqual(5);
    });

    it("sets routedAt timestamp", () => {
      const input = createRoutingInput(mockOrder, mockSuppliers, "balanced");
      const result = routeOrder(input);
      expect(result.routedAt).toBeDefined();
      expect(new Date(result.routedAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe("createRoutingInput", () => {
    it("creates input with default settings", () => {
      const input = createRoutingInput(mockOrder, mockSuppliers);
      expect(input.optimization).toBe("balanced");
      expect(input.maxShippingDays).toBe(15);
      expect(input.minReliability).toBe(80);
    });

    it("creates input with custom settings", () => {
      const input = createRoutingInput(mockOrder, mockSuppliers, "speed", {
        maxShippingDays: 10,
        minReliability: 90,
        preferLocalWarehouse: true,
      });
      expect(input.optimization).toBe("speed");
      expect(input.maxShippingDays).toBe(10);
      expect(input.minReliability).toBe(90);
      expect(input.preferLocalWarehouse).toBe(true);
    });
  });

  describe("selectBestSupplier", () => {
    it("returns best supplier from list", () => {
      const best = selectBestSupplier(mockSuppliers, "cost", 80);
      expect(best).toBeDefined();
      expect(best!.supplierId).toBe("aliexpress");
    });

    it("returns null when no suppliers meet criteria", () => {
      const best = selectBestSupplier(mockSuppliers, "cost", 99);
      expect(best).toBeNull();
    });

    it("returns null for empty list", () => {
      const best = selectBestSupplier([], "cost", 80);
      expect(best).toBeNull();
    });
  });
});

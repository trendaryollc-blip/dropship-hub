import { describe, it, expect } from "vitest";
import { searchKnowledgeBase, buildKnowledgeBaseFromProducts, buildKnowledgeBaseFromOrders, generateFAQEntries, formatKnowledgeBaseResponse, categorizeIncomingMessage } from "./cs-knowledge-base";
import type { KnowledgeBaseEntry } from "@/types/customer-service";

const mockEntries: KnowledgeBaseEntry[] = [
  {
    id: "kb-1",
    category: "faq",
    title: "Shipping Time",
    content: "Standard shipping takes 7-15 business days.",
    keywords: ["shipping", "delivery", "time", "how long"],
    usageCount: 10,
    createdAt: new Date().toISOString(),
  },
  {
    id: "kb-2",
    category: "returns",
    title: "Return Policy",
    content: "30-day return policy. Items must be unused.",
    keywords: ["return", "refund", "exchange", "30 days"],
    usageCount: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: "kb-3",
    category: "product",
    title: "Product: Wireless Earbuds",
    content: "Bluetooth 5.0, 8hr battery, noise cancellation",
    keywords: ["wireless", "earbuds", "bluetooth", "noise"],
    usageCount: 3,
    createdAt: new Date().toISOString(),
  },
];

describe("cs-knowledge-base", () => {
  describe("searchKnowledgeBase", () => {
    it("finds relevant entries by keyword", () => {
      const results = searchKnowledgeBase(mockEntries, "shipping time");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entry.id).toBe("kb-1");
    });

    it("finds entries by title match", () => {
      const results = searchKnowledgeBase(mockEntries, "return policy");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entry.id).toBe("kb-2");
    });

    it("finds entries by content match", () => {
      const results = searchKnowledgeBase(mockEntries, "bluetooth earbuds");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.entry.id === "kb-3")).toBe(true);
    });

    it("returns empty for truly unmatched entries", () => {
      const emptyEntries: KnowledgeBaseEntry[] = [];
      const results = searchKnowledgeBase(emptyEntries, "quantum physics");
      expect(results.length).toBe(0);
    });

    it("respects maxResults limit", () => {
      const results = searchKnowledgeBase(mockEntries, "shipping", 1);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it("ranks by relevance", () => {
      const results = searchKnowledgeBase(mockEntries, "shipping");
      if (results.length > 1) {
        expect(results[0].relevance).toBeGreaterThanOrEqual(results[1].relevance);
      }
    });

    it("returns matched keywords", () => {
      const results = searchKnowledgeBase(mockEntries, "shipping time");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matchedKeywords.length).toBeGreaterThan(0);
    });
  });

  describe("buildKnowledgeBaseFromProducts", () => {
    it("creates entries from products", () => {
      const products = [{ title: "Test Product", description: "A test product description", price: 29.99, specifications: { Color: "Blue", Size: "M" } }];
      const entries = buildKnowledgeBaseFromProducts(products);
      expect(entries.length).toBe(2);
      expect(entries[0].category).toBe("product");
      expect(entries[0].productTitle).toBe("Test Product");
    });

    it("handles products without specs", () => {
      const products = [{ title: "Simple Product", description: "Simple description", price: 19.99 }];
      const entries = buildKnowledgeBaseFromProducts(products);
      expect(entries.length).toBe(1);
    });

    it("extracts keywords from products", () => {
      const products = [{ title: "Wireless Bluetooth Earbuds", description: "Premium audio quality earbuds", price: 49.99 }];
      const entries = buildKnowledgeBaseFromProducts(products);
      expect(entries[0].keywords.length).toBeGreaterThan(0);
    });
  });

  describe("buildKnowledgeBaseFromOrders", () => {
    it("creates entries from orders", () => {
      const orders = [
        { productTitle: "Widget A", status: "shipped", trackingNumber: "TRK123" },
        { productTitle: "Widget B", status: "shipped", trackingNumber: "TRK456" },
        { productTitle: "Widget C", status: "delivered" },
      ];
      const entries = buildKnowledgeBaseFromOrders(orders);
      expect(entries.length).toBe(2);
      expect(entries.some((e) => e.title === "Order Status: shipped")).toBe(true);
      expect(entries.some((e) => e.title === "Order Status: delivered")).toBe(true);
    });
  });

  describe("generateFAQEntries", () => {
    it("generates FAQ entries", () => {
      const entries = generateFAQEntries();
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.every((e) => e.category === "faq" || e.category === "returns" || e.category === "shipping" || e.category === "policy")).toBe(true);
    });

    it("includes keywords for each entry", () => {
      const entries = generateFAQEntries();
      expect(entries.every((e) => e.keywords.length > 0)).toBe(true);
    });
  });

  describe("formatKnowledgeBaseResponse", () => {
    it("formats search results", () => {
      const results = searchKnowledgeBase(mockEntries, "shipping");
      const formatted = formatKnowledgeBaseResponse(results);
      expect(formatted).toBeTruthy();
      expect(formatted).toContain("[");
    });

    it("returns empty for no results", () => {
      expect(formatKnowledgeBaseResponse([])).toBe("");
    });
  });

  describe("categorizeIncomingMessage", () => {
    it("categorizes order status messages", () => {
      expect(categorizeIncomingMessage("Where is my order?")).toBe("order_status");
      expect(categorizeIncomingMessage("Can you track my package?")).toBe("order_status");
    });

    it("categorizes refund messages", () => {
      expect(categorizeIncomingMessage("I want a refund")).toBe("refund");
      expect(categorizeIncomingMessage("Money back please")).toBe("refund");
    });

    it("categorizes complaints", () => {
      expect(categorizeIncomingMessage("The item is broken")).toBe("complaint");
      expect(categorizeIncomingMessage("This is defective")).toBe("complaint");
    });

    it("categorizes product questions", () => {
      expect(categorizeIncomingMessage("How does this work?")).toBe("product_question");
      expect(categorizeIncomingMessage("Is this compatible with iPhone?")).toBe("product_question");
    });

    it("defaults to general", () => {
      expect(categorizeIncomingMessage("Hello")).toBe("general");
    });
  });
});

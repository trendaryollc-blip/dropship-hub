import { describe, it, expect } from "vitest";
import {
  DEFAULT_RETRY_CONFIG,
  DEFAULT_PRICE_DROP_THRESHOLD,
  MAX_PRICE_HISTORY_DAYS,
  type MonitoredProduct,
  type PriceHistoryEntry,
  type PriceAlert,
  type RepricingRule,
  type MonitoringMetrics,
  type RepriceAuditEntry,
  type NotificationPayload,
  type RetryConfig,
} from "./types";

describe("monitoring types", () => {
  describe("DEFAULT_RETRY_CONFIG", () => {
    it("has maxRetries of 3", () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
    });

    it("has baseDelayMs of 1000", () => {
      expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBe(1000);
    });

    it("has maxDelayMs of 30000", () => {
      expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30000);
    });

    it("is a valid RetryConfig", () => {
      const config: RetryConfig = DEFAULT_RETRY_CONFIG;
      expect(config.maxRetries).toBeGreaterThanOrEqual(0);
      expect(config.baseDelayMs).toBeGreaterThan(0);
      expect(config.maxDelayMs).toBeGreaterThan(config.baseDelayMs);
    });
  });

  describe("DEFAULT_PRICE_DROP_THRESHOLD", () => {
    it("is 5 percent", () => {
      expect(DEFAULT_PRICE_DROP_THRESHOLD).toBe(5);
    });
  });

  describe("MAX_PRICE_HISTORY_DAYS", () => {
    it("is 90 days", () => {
      expect(MAX_PRICE_HISTORY_DAYS).toBe(90);
    });
  });

  describe("MonitoredProduct", () => {
    it("can be constructed with required fields", () => {
      const product: MonitoredProduct = {
        productId: "p1",
        productTitle: "Test Product",
        source: "amazon",
        sourceUrl: "https://amazon.com/dp/123",
        currentPrice: 29.99,
        lowestPrice: 25.99,
        highestPrice: 34.99,
        lastChecked: new Date().toISOString(),
        priceHistory: [],
        stockStatus: "in_stock",
        alerts: [],
      };
      expect(product.productId).toBe("p1");
      expect(product.stockStatus).toBe("in_stock");
    });

    it("allows optional fields", () => {
      const product: MonitoredProduct = {
        productId: "p1",
        productTitle: "Test",
        source: "amazon",
        sourceUrl: "https://amazon.com/dp/123",
        currentPrice: 10,
        lowestPrice: 8,
        highestPrice: 12,
        lastChecked: new Date().toISOString(),
        priceHistory: [],
        stockStatus: "in_stock",
        alerts: [],
        repricingRule: { enabled: true, type: "undercut", value: 5 },
        priceDropThreshold: 10,
        competitorUrls: ["https://example.com"],
        autoDelist: true,
        storeConnections: [{ storeId: "s1", platform: "shopify", storeUrl: "https://shop.myshopify.com", apiKey: "key", apiSecret: "secret" }],
      };
      expect(product.repricingRule?.type).toBe("undercut");
      expect(product.autoDelist).toBe(true);
    });
  });

  describe("PriceHistoryEntry", () => {
    it("can be constructed", () => {
      const entry: PriceHistoryEntry = {
        date: "2025-01-15",
        price: 29.99,
        source: "scrape",
      };
      expect(entry.price).toBe(29.99);
    });

    it("allows optional source", () => {
      const entry: PriceHistoryEntry = { date: "2025-01-15", price: 10 };
      expect(entry.source).toBeUndefined();
    });
  });

  describe("PriceAlert", () => {
    it("can be constructed", () => {
      const alert: PriceAlert = {
        id: "a1",
        type: "price_drop",
        message: "Price dropped",
        oldPrice: 30,
        newPrice: 25,
        createdAt: new Date().toISOString(),
        read: false,
      };
      expect(alert.type).toBe("price_drop");
      expect(alert.read).toBe(false);
    });
  });

  describe("RepricingRule", () => {
    it("can be constructed", () => {
      const rule: RepricingRule = { enabled: true, type: "maintain_margin", value: 30 };
      expect(rule.enabled).toBe(true);
      expect(rule.type).toBe("maintain_margin");
    });
  });

  describe("MonitoringMetrics", () => {
    it("can be constructed", () => {
      const metrics: MonitoringMetrics = {
        totalMonitored: 10,
        inStock: 8,
        outOfStock: 1,
        unknown: 1,
        avgPriceChangePercent: 2.5,
        totalAlerts: 15,
        unreadAlerts: 5,
        priceDrops24h: 3,
        priceIncreases24h: 1,
        stockOutEvents24h: 0,
        lastCheckTime: new Date().toISOString(),
      };
      expect(metrics.totalMonitored).toBe(10);
    });
  });

  describe("RepriceAuditEntry", () => {
    it("can be constructed", () => {
      const entry: RepriceAuditEntry = {
        id: "r1",
        productId: "p1",
        productTitle: "Test Product",
        oldSellPrice: 30,
        newSellPrice: 28,
        supplierPrice: 10,
        ruleType: "undercut",
        ruleValue: 5,
        storeUpdated: true,
        storePlatform: "shopify",
        createdAt: new Date().toISOString(),
      };
      expect(entry.storeUpdated).toBe(true);
    });

    it("allows optional error field", () => {
      const entry: RepriceAuditEntry = {
        id: "r1",
        productId: "p1",
        productTitle: "Test",
        oldSellPrice: 30,
        newSellPrice: 28,
        supplierPrice: 10,
        ruleType: "undercut",
        ruleValue: 5,
        storeUpdated: false,
        error: "API timeout",
        createdAt: new Date().toISOString(),
      };
      expect(entry.error).toBe("API timeout");
    });
  });

  describe("NotificationPayload", () => {
    it("can be constructed with price_drop type", () => {
      const payload: NotificationPayload = {
        type: "price_drop",
        productTitle: "Test",
        productId: "p1",
        oldPrice: 30,
        newPrice: 25,
        message: "Dropped",
      };
      expect(payload.type).toBe("price_drop");
    });

    it("can be constructed with out_of_stock type", () => {
      const payload: NotificationPayload = {
        type: "out_of_stock",
        productTitle: "Test",
        productId: "p1",
        message: "Out of stock",
      };
      expect(payload.type).toBe("out_of_stock");
    });
  });
});

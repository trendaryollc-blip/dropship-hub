import { describe, it, expect } from "vitest";
import {
  DEFAULT_RETRY_CONFIG,
  DEFAULT_PRICE_DROP_THRESHOLD,
  MAX_PRICE_HISTORY_DAYS,
  type MonitoredProduct,
  type PriceAlert,
  type RepricingRule,
  type CompetitorSnapshot,
  type MonitoringMetrics,
  type RepriceAuditEntry,
  type NotificationPayload,
} from "@/lib/monitoring/types";

describe("monitoring types", () => {
  it("has correct default retry config", () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBe(1000);
    expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30000);
  });

  it("has correct default price drop threshold", () => {
    expect(DEFAULT_PRICE_DROP_THRESHOLD).toBe(5);
  });

  it("has correct max price history days", () => {
    expect(MAX_PRICE_HISTORY_DAYS).toBe(90);
  });

  it("MonitoredProduct type is constructible", () => {
    const product: MonitoredProduct = {
      productId: "123",
      productTitle: "Test",
      source: "cj",
      sourceUrl: "https://example.com",
      currentPrice: 29.99,
      lowestPrice: 25.99,
      highestPrice: 34.99,
      lastChecked: new Date().toISOString(),
      priceHistory: [],
      stockStatus: "in_stock",
      alerts: [],
    };
    expect(product.productId).toBe("123");
    expect(product.stockStatus).toBe("in_stock");
  });

  it("PriceAlert type is constructible", () => {
    const alert: PriceAlert = {
      id: "alert-1",
      type: "price_drop",
      message: "Price dropped",
      oldPrice: 50,
      newPrice: 40,
      createdAt: new Date().toISOString(),
      read: false,
    };
    expect(alert.type).toBe("price_drop");
    expect(alert.read).toBe(false);
  });

  it("RepricingRule type is constructible", () => {
    const rule: RepricingRule = {
      enabled: true,
      type: "maintain_margin",
      value: 50,
    };
    expect(rule.enabled).toBe(true);
    expect(rule.value).toBe(50);
  });

  it("CompetitorSnapshot type is constructible", () => {
    const snapshot: CompetitorSnapshot = {
      url: "https://competitor.com",
      price: 45.99,
      inStock: true,
      scrapedAt: new Date().toISOString(),
    };
    expect(snapshot.price).toBe(45.99);
  });

  it("MonitoringMetrics type is constructible", () => {
    const metrics: MonitoringMetrics = {
      totalMonitored: 10,
      inStock: 8,
      outOfStock: 1,
      unknown: 1,
      avgPriceChangePercent: 2.5,
      totalAlerts: 15,
      unreadAlerts: 5,
      priceDrops24h: 3,
      priceIncreases24h: 2,
      stockOutEvents24h: 1,
      lastCheckTime: new Date().toISOString(),
    };
    expect(metrics.totalMonitored).toBe(10);
    expect(metrics.unreadAlerts).toBe(5);
  });

  it("RepriceAuditEntry type is constructible", () => {
    const entry: RepriceAuditEntry = {
      id: "audit-1",
      productId: "prod1",
      productTitle: "Test",
      oldSellPrice: 50,
      newSellPrice: 55,
      supplierPrice: 25,
      ruleType: "maintain_margin",
      ruleValue: 50,
      storeUpdated: true,
      storePlatform: "shopify",
      createdAt: new Date().toISOString(),
    };
    expect(entry.storePlatform).toBe("shopify");
  });

  it("NotificationPayload type is constructible", () => {
    const payload: NotificationPayload = {
      type: "price_drop",
      productTitle: "Test",
      productId: "prod1",
      oldPrice: 50,
      newPrice: 40,
      message: "Dropped",
    };
    expect(payload.type).toBe("price_drop");
  });

  it("supports all alert types", () => {
    const types: PriceAlert["type"][] = [
      "price_drop",
      "price_increase",
      "out_of_stock",
      "back_in_stock",
      "competitor_undercut",
    ];
    expect(types).toHaveLength(5);
  });

  it("supports all repricing rule types", () => {
    const types: RepricingRule["type"][] = ["maintain_margin", "undercut", "fixed_price"];
    expect(types).toHaveLength(3);
  });

  it("supports all notification types", () => {
    const types: NotificationPayload["type"][] = [
      "price_drop",
      "price_increase",
      "out_of_stock",
      "back_in_stock",
      "competitor_undercut",
    ];
    expect(types).toHaveLength(5);
  });
});

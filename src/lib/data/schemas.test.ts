import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  UserSettingsSchema,
  FavoriteSchema,
  CalcHistoryEntrySchema,
  ChatMessageSchema,
  RevenueEntrySchema,
  AlertEntrySchema,
  MissionEntrySchema,
  WatchlistEntrySchema,
  SearchHistoryEntrySchema,
  DigestEntrySchema,
  CostProfileEntrySchema,
  ProfitEntryDocSchema,
  SupplierPerformanceDocSchema,
  ProductLifecycleDocSchema,
  CSConversationDocSchema,
  StoreConnectionSchema,
  PlatformFirestoreConfigSchema,
  ReturnRequestDocSchema,
  AdCampaignSchema,
  AdCreativeSchema,
  ABTestSchema,
  PriceRuleSchema,
  ShippingPreferencesDocSchema,
  ProductInputSchema,
  ListingGenerationInputSchema,
  TrendSignalSchema,
  TrendPredictionSchema,
  RisingStarSchema,
  AddFavoriteInputSchema,
  AddAlertInputSchema,
  AddRevenueEntryInputSchema,
  AddCostProfileInputSchema,
  AddProfitEntryInputSchema,
  AddReturnRequestInputSchema,
  AddAdCampaignInputSchema,
  GenerateCreativeInputSchema,
  AddPriceRuleInputSchema,
} from "./schemas";

const ts = new Date().toISOString();

// ── UserSettingsSchema ──────────────────────────────────────────────────────

describe("UserSettingsSchema", () => {
  it("accepts valid settings", () => {
    const data = {
      aiProviderPriority: [{ id: "openai", active: true, priority: 1 }],
      defaultCurrency: "USD",
      notifications: true,
      theme: "dark" as const,
      digestSettings: {
        enabled: true,
        frequency: "daily" as const,
        includeMetrics: true,
        includeAlerts: false,
        includeRecommendations: true,
        includeWeeklyTrend: false,
      },
    };
    expect(UserSettingsSchema.parse(data)).toBeDefined();
  });

  it("rejects invalid theme enum", () => {
    expect(() =>
      UserSettingsSchema.parse({
        aiProviderPriority: [],
        defaultCurrency: "USD",
        notifications: false,
        theme: "blue",
        digestSettings: {
          enabled: true,
          frequency: "daily",
          includeMetrics: true,
          includeAlerts: false,
          includeRecommendations: false,
          includeWeeklyTrend: false,
        },
      })
    ).toThrow();
  });

  it("rejects invalid frequency enum", () => {
    expect(() =>
      UserSettingsSchema.parse({
        aiProviderPriority: [],
        defaultCurrency: "USD",
        notifications: false,
        theme: "light",
        digestSettings: {
          enabled: true,
          frequency: "monthly",
          includeMetrics: true,
          includeAlerts: false,
          includeRecommendations: false,
          includeWeeklyTrend: false,
        },
      })
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() =>
      UserSettingsSchema.parse({ theme: "dark" })
    ).toThrow();
  });
});

// ── FavoriteSchema ─────────────────────────────────────────────────────────

describe("FavoriteSchema", () => {
  it("accepts valid favorite", () => {
    expect(
      FavoriteSchema.parse({ type: "product", itemId: "p1", title: "Widget", addedAt: ts })
    ).toBeDefined();
  });

  it("rejects invalid type enum", () => {
    expect(() =>
      FavoriteSchema.parse({ type: "invalid", itemId: "p1", title: "W", addedAt: ts })
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => FavoriteSchema.parse({ type: "product" })).toThrow();
  });
});

// ── CalcHistoryEntrySchema ────────────────────────────────────────────────

describe("CalcHistoryEntrySchema", () => {
  it("accepts valid entry", () => {
    expect(
      CalcHistoryEntrySchema.parse({
        type: "profit",
        inputs: { cost: 10 },
        result: { profit: 5 },
        savedAt: ts,
      })
    ).toBeDefined();
  });

  it("rejects invalid type", () => {
    expect(() =>
      CalcHistoryEntrySchema.parse({
        type: "tax",
        inputs: { cost: 10 },
        result: { profit: 5 },
        savedAt: ts,
      })
    ).toThrow();
  });

  it("rejects non-number values in inputs", () => {
    expect(() =>
      CalcHistoryEntrySchema.parse({
        type: "profit",
        inputs: { cost: "bad" },
        result: { profit: 5 },
        savedAt: ts,
      })
    ).toThrow();
  });
});

// ── ChatMessageSchema ─────────────────────────────────────────────────────

describe("ChatMessageSchema", () => {
  it("accepts valid message", () => {
    expect(
      ChatMessageSchema.parse({
        role: "user",
        content: "Hello",
        provider: "openai",
        timestamp: ts,
      })
    ).toBeDefined();
  });

  it("accepts message without optional provider", () => {
    const msg = ChatMessageSchema.parse({ role: "assistant", content: "Hi", timestamp: ts });
    expect(msg.provider).toBeUndefined();
  });

  it("rejects invalid role", () => {
    expect(() =>
      ChatMessageSchema.parse({ role: "system", content: "x", timestamp: ts })
    ).toThrow();
  });
});

// ── RevenueEntrySchema ────────────────────────────────────────────────────

describe("RevenueEntrySchema", () => {
  it("accepts valid entry", () => {
    expect(
      RevenueEntrySchema.parse({
        date: "2024-01-15",
        amount: 500,
        orders: 10,
        profit: 100,
        createdAt: ts,
      })
    ).toBeDefined();
  });

  it("rejects non-number amount", () => {
    expect(() =>
      RevenueEntrySchema.parse({ date: "2024-01-15", amount: "bad", orders: 10, createdAt: ts })
    ).toThrow();
  });

  it("rejects non-number orders", () => {
    expect(() =>
      RevenueEntrySchema.parse({ date: "2024-01-15", amount: 100, orders: "ten", createdAt: ts })
    ).toThrow();
  });
});

// ── AlertEntrySchema ──────────────────────────────────────────────────────

describe("AlertEntrySchema", () => {
  it("accepts valid alert", () => {
    expect(
      AlertEntrySchema.parse({
        type: "warning",
        title: "High stock",
        description: "Running low",
        read: false,
        createdAt: ts,
      })
    ).toBeDefined();
  });

  it("rejects invalid type", () => {
    expect(() =>
      AlertEntrySchema.parse({
        type: "critical",
        title: "T",
        description: "D",
        read: false,
        createdAt: ts,
      })
    ).toThrow();
  });

  it("accepts all valid enum values", () => {
    for (const type of ["opportunity", "risk", "info", "warning"]) {
      expect(
        AlertEntrySchema.parse({ type, title: "T", description: "D", read: true, createdAt: ts })
      ).toBeDefined();
    }
  });
});

// ── MissionEntrySchema ────────────────────────────────────────────────────

describe("MissionEntrySchema", () => {
  it("accepts valid mission", () => {
    expect(
      MissionEntrySchema.parse({ text: "Research suppliers", done: false, date: "2024-01-15", createdAt: ts })
    ).toBeDefined();
  });

  it("rejects non-string text", () => {
    expect(() =>
      MissionEntrySchema.parse({ text: 123, done: false, date: "2024-01-15", createdAt: ts })
    ).toThrow();
  });

  it("rejects non-boolean done", () => {
    expect(() =>
      MissionEntrySchema.parse({ text: "task", done: "yes", date: "2024-01-15", createdAt: ts })
    ).toThrow();
  });
});

// ── WatchlistEntrySchema ──────────────────────────────────────────────────

describe("WatchlistEntrySchema", () => {
  it("accepts valid entry", () => {
    expect(
      WatchlistEntrySchema.parse({
        type: "product",
        title: "Widget",
        itemId: "p1",
        currentPrice: 29.99,
        targetPrice: 24.99,
        notes: "Watch closely",
        addedAt: ts,
      })
    ).toBeDefined();
  });

  it("rejects invalid type enum", () => {
    expect(() =>
      WatchlistEntrySchema.parse({ type: "store", title: "W", itemId: "1", addedAt: ts })
    ).toThrow();
  });

  it("accepts with optional fields undefined", () => {
    const entry = WatchlistEntrySchema.parse({
      type: "niche",
      title: "Niche",
      itemId: "n1",
      addedAt: ts,
    });
    expect(entry.currentPrice).toBeUndefined();
  });
});

// ── SearchHistoryEntrySchema ──────────────────────────────────────────────

describe("SearchHistoryEntrySchema", () => {
  it("accepts valid entry", () => {
    expect(
      SearchHistoryEntrySchema.parse({ query: "phone case", source: "aliexpress", resultCount: 50, createdAt: ts })
    ).toBeDefined();
  });

  it("rejects missing required fields", () => {
    expect(() => SearchHistoryEntrySchema.parse({ query: "test" })).toThrow();
  });

  it("accepts without optional resultCount", () => {
    const entry = SearchHistoryEntrySchema.parse({ query: "x", source: "google", createdAt: ts });
    expect(entry.resultCount).toBeUndefined();
  });
});

// ── DigestEntrySchema ─────────────────────────────────────────────────────

describe("DigestEntrySchema", () => {
  const validDigest = {
    date: "2024-01-15",
    summary: "Good day",
    metrics: { orders: 10, revenue: 500, profit: 100, stockAlerts: 2, supplierDelays: 0 },
    alerts: [{ type: "stock" as const, title: "Low stock", description: "Item X running out", severity: "medium" as const }],
    recommendations: ["Restock Item X"],
    generatedAt: ts,
  };

  it("accepts valid digest", () => {
    expect(DigestEntrySchema.parse(validDigest)).toBeDefined();
  });

  it("accepts with weeklyTrend optional", () => {
    const withTrend = {
      ...validDigest,
      weeklyTrend: { direction: "up" as const, percentage: 15, insight: "Growing" },
    };
    expect(DigestEntrySchema.parse(withTrend)).toBeDefined();
  });

  it("rejects invalid alert severity", () => {
    const bad = {
      ...validDigest,
      alerts: [{ type: "stock", title: "T", description: "D", severity: "critical" }],
    };
    expect(() => DigestEntrySchema.parse(bad)).toThrow();
  });

  it("rejects invalid weeklyTrend direction", () => {
    const bad = {
      ...validDigest,
      weeklyTrend: { direction: "flat", percentage: 5, insight: "No change" },
    };
    expect(() => DigestEntrySchema.parse(bad)).toThrow();
  });
});

// ── CostProfileEntrySchema ────────────────────────────────────────────────

describe("CostProfileEntrySchema", () => {
  it("accepts valid cost profile", () => {
    expect(
      CostProfileEntrySchema.parse({
        productId: "p1",
        productTitle: "Widget",
        cogs: 5,
        shippingCost: 3,
        platformFeePercent: 15,
        paymentProcessingPercent: 2.9,
        packagingCost: 0.5,
        otherCosts: 1,
        createdAt: ts,
      })
    ).toBeDefined();
  });

  it("rejects non-number cogs", () => {
    expect(() =>
      CostProfileEntrySchema.parse({
        productId: "p1",
        productTitle: "W",
        cogs: "cheap",
        shippingCost: 3,
        platformFeePercent: 15,
        paymentProcessingPercent: 2.9,
        packagingCost: 0.5,
        otherCosts: 1,
        createdAt: ts,
      })
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() =>
      CostProfileEntrySchema.parse({ productId: "p1" })
    ).toThrow();
  });
});

// ── ProfitEntryDocSchema ──────────────────────────────────────────────────

describe("ProfitEntryDocSchema", () => {
  it("accepts valid profit entry", () => {
    expect(
      ProfitEntryDocSchema.parse({
        orderId: "ORD-001",
        date: "2024-01-15",
        productTitle: "Widget",
        platform: "shopify",
        revenue: 100,
        cogs: 30,
        shippingCost: 10,
        platformFee: 15,
        paymentProcessing: 3,
        refunds: 0,
        adSpend: 5,
        netProfit: 37,
        profitMargin: 37,
        createdAt: ts,
      })
    ).toBeDefined();
  });

  it("rejects negative netProfit", () => {
    expect(() =>
      ProfitEntryDocSchema.parse({
        orderId: "ORD-001",
        date: "2024-01-15",
        productTitle: "W",
        platform: "shopify",
        revenue: 100,
        cogs: 30,
        shippingCost: 10,
        platformFee: 15,
        paymentProcessing: 3,
        refunds: 0,
        adSpend: 5,
        netProfit: "bad",
        profitMargin: 37,
        createdAt: ts,
      })
    ).toThrow();
  });

  it("rejects missing orderId", () => {
    expect(() =>
      ProfitEntryDocSchema.parse({
        date: "2024-01-15",
        productTitle: "W",
        platform: "shopify",
        revenue: 100,
        cogs: 30,
        shippingCost: 10,
        platformFee: 15,
        paymentProcessing: 3,
        refunds: 0,
        adSpend: 5,
        netProfit: 37,
        profitMargin: 37,
        createdAt: ts,
      })
    ).toThrow();
  });
});

// ── SupplierPerformanceDocSchema ──────────────────────────────────────────

describe("SupplierPerformanceDocSchema", () => {
  it("accepts valid supplier performance", () => {
    expect(
      SupplierPerformanceDocSchema.parse({
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        reliabilityScore: 95,
        refundRate: 2,
        avgShippingDays: 12,
        complaintRate: 1,
        stockReliability: 90,
        snapshotDate: "2024-01-15",
        createdAt: ts,
      })
    ).toBeDefined();
  });

  it("rejects non-string supplierId", () => {
    expect(() =>
      SupplierPerformanceDocSchema.parse({
        supplierId: 123,
        supplierName: "CJ",
        reliabilityScore: 95,
        refundRate: 2,
        avgShippingDays: 12,
        complaintRate: 1,
        stockReliability: 90,
        snapshotDate: "2024-01-15",
        createdAt: ts,
      })
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() =>
      SupplierPerformanceDocSchema.parse({ supplierId: "cj" })
    ).toThrow();
  });
});

// ── ProductLifecycleDocSchema ─────────────────────────────────────────────

describe("ProductLifecycleDocSchema", () => {
  it("accepts valid lifecycle doc", () => {
    expect(
      ProductLifecycleDocSchema.parse({
        productId: "p1",
        productTitle: "Widget",
        currentStage: "winning",
        stageEnteredAt: "2024-01-01",
        totalDaysTracked: 30,
        createdAt: ts,
      })
    ).toBeDefined();
  });

  it("rejects non-number totalDaysTracked", () => {
    expect(() =>
      ProductLifecycleDocSchema.parse({
        productId: "p1",
        productTitle: "W",
        currentStage: "testing",
        stageEnteredAt: "2024-01-01",
        totalDaysTracked: "thirty",
        createdAt: ts,
      })
    ).toThrow();
  });

  it("rejects missing fields", () => {
    expect(() =>
      ProductLifecycleDocSchema.parse({ productId: "p1" })
    ).toThrow();
  });
});

// ── CSConversationDocSchema ───────────────────────────────────────────────

describe("CSConversationDocSchema", () => {
  it("accepts valid conversation", () => {
    expect(
      CSConversationDocSchema.parse({
        customerName: "John",
        customerEmail: "john@test.com",
        platform: "shopify",
        status: "active",
        subject: "Order issue",
        lastMessage: "Please help",
        messageCount: 3,
        aiHandled: false,
        createdAt: ts,
      })
    ).toBeDefined();
  });

  it("rejects invalid status enum", () => {
    expect(() =>
      CSConversationDocSchema.parse({
        customerName: "John",
        customerEmail: "j@t.com",
        platform: "shopify",
        status: "closed",
        subject: "S",
        lastMessage: "M",
        messageCount: 1,
        aiHandled: false,
        createdAt: ts,
      })
    ).toThrow();
  });

  it("accepts all valid statuses", () => {
    for (const status of ["active", "escalated", "resolved", "waiting"]) {
      expect(
        CSConversationDocSchema.parse({
          customerName: "J",
          customerEmail: "j@t.com",
          platform: "shopify",
          status,
          subject: "S",
          lastMessage: "M",
          messageCount: 1,
          aiHandled: false,
          createdAt: ts,
        })
      ).toBeDefined();
    }
  });
});

// ── StoreConnectionSchema ─────────────────────────────────────────────────

describe("StoreConnectionSchema", () => {
  it("accepts valid connection", () => {
    expect(
      StoreConnectionSchema.parse({
        platform: "shopify",
        name: "My Store",
        url: "https://my-store.myshopify.com",
        status: "connected",
        connectedAt: ts,
      })
    ).toBeDefined();
  });

  it("rejects invalid status enum", () => {
    expect(() =>
      StoreConnectionSchema.parse({
        platform: "shopify",
        name: "Store",
        url: "https://store.com",
        status: "pending",
        connectedAt: ts,
      })
    ).toThrow();
  });

  it("accepts with optional fields", () => {
    const conn = StoreConnectionSchema.parse({
      platform: "woocommerce",
      name: "WC Store",
      url: "https://store.com",
      apiKey: "key123",
      apiSecret: "secret456",
      accessToken: "token789",
      storeDomain: "store.com",
      status: "disconnected",
      connectedAt: ts,
      lastSyncAt: ts,
    });
    expect(conn.apiKey).toBe("key123");
    expect(conn.lastSyncAt).toBeDefined();
  });
});

// ── PlatformFirestoreConfigSchema ────────────────────────────────────────

describe("PlatformFirestoreConfigSchema", () => {
  it("accepts valid config", () => {
    expect(
      PlatformFirestoreConfigSchema.parse({
        name: "Amazon",
        method: "rainforest",
        enabled: true,
        keys: [],
        lastHealth: "healthy",
        lastSearched: ts,
        lastError: null,
        cooldownUntil: null,
        createdAt: ts,
        updatedAt: ts,
      })
    ).toBeDefined();
  });

  it("rejects invalid method enum", () => {
    expect(() =>
      PlatformFirestoreConfigSchema.parse({
        name: "Amazon",
        method: "scrapingbee",
        enabled: true,
        keys: [],
        lastHealth: "healthy",
        lastSearched: null,
        lastError: null,
        cooldownUntil: null,
        createdAt: ts,
        updatedAt: ts,
      })
    ).toThrow();
  });

  it("rejects invalid lastHealth enum", () => {
    expect(() =>
      PlatformFirestoreConfigSchema.parse({
        name: "Amazon",
        method: "rainforest",
        enabled: true,
        keys: [],
        lastHealth: "degraded",
        lastSearched: null,
        lastError: null,
        cooldownUntil: null,
        createdAt: ts,
        updatedAt: ts,
      })
    ).toThrow();
  });
});

// ── ReturnRequestDocSchema ────────────────────────────────────────────────

describe("ReturnRequestDocSchema", () => {
  const validReturn = {
    orderId: "ORD-001",
    orderNumber: "12345",
    customerId: "c1",
    customerName: "Jane",
    customerEmail: "jane@test.com",
    items: [
      {
        productId: "p1",
        productName: "Widget",
        quantity: 1,
        unitPrice: 29.99,
        imageUrl: "https://img.com/p1.jpg",
      },
    ],
    reason: "defective" as const,
    reasonDetails: "Broken on arrival",
    status: "pending" as const,
    returnLabel: null,
    refundAmount: 29.99,
    supplierId: "cj",
    supplierName: "CJ",
    platform: "shopify",
    storePlatform: "shopify",
    createdAt: ts,
  };

  it("accepts valid return request", () => {
    expect(ReturnRequestDocSchema.parse(validReturn)).toBeDefined();
  });

  it("rejects invalid reason enum", () => {
    expect(() =>
      ReturnRequestDocSchema.parse({ ...validReturn, reason: "missing" })
    ).toThrow();
  });

  it("rejects invalid status enum", () => {
    expect(() =>
      ReturnRequestDocSchema.parse({ ...validReturn, status: "processing" })
    ).toThrow();
  });

  it("accepts empty items array (no min constraint on doc schema)", () => {
    const entry = ReturnRequestDocSchema.parse({ ...validReturn, items: [] });
    expect(entry.items).toEqual([]);
  });
});

// ── AdCampaignSchema ─────────────────────────────────────────────────────

describe("AdCampaignSchema", () => {
  const validCampaign = {
    platform: "facebook" as const,
    name: "Summer Sale",
    status: "active" as const,
    productTitle: "Widget",
    dailyBudget: 50,
    startDate: "2024-01-01",
    metrics: {
      impressions: 1000,
      clicks: 50,
      conversions: 5,
      spend: 100,
      revenue: 500,
      roas: 5,
      cpc: 2,
      ctr: 5,
      conversionRate: 10,
    },
    createdAt: ts,
    updatedAt: ts,
  };

  it("accepts valid campaign", () => {
    expect(AdCampaignSchema.parse(validCampaign)).toBeDefined();
  });

  it("rejects invalid platform enum", () => {
    expect(() =>
      AdCampaignSchema.parse({ ...validCampaign, platform: "tiktok" })
    ).toThrow();
  });

  it("rejects invalid status enum", () => {
    expect(() =>
      AdCampaignSchema.parse({ ...validCampaign, status: "archived" })
    ).toThrow();
  });

  it("rejects negative dailyBudget", () => {
    expect(() =>
      AdCampaignSchema.parse({ ...validCampaign, dailyBudget: -10 })
    ).toThrow();
  });
});

// ── AdCreativeSchema ─────────────────────────────────────────────────────

describe("AdCreativeSchema", () => {
  it("accepts valid creative", () => {
    expect(
      AdCreativeSchema.parse({
        campaignId: "c1",
        platform: "google",
        type: "headline",
        content: "Best Widget Ever",
        aiProvider: "openai",
        createdAt: ts,
      })
    ).toBeDefined();
  });

  it("rejects invalid type enum", () => {
    expect(() =>
      AdCreativeSchema.parse({
        campaignId: "c1",
        platform: "google",
        type: "image",
        content: "text",
        aiProvider: "openai",
        createdAt: ts,
      })
    ).toThrow();
  });

  it("rejects invalid platform enum", () => {
    expect(() =>
      AdCreativeSchema.parse({
        campaignId: "c1",
        platform: "tiktok",
        type: "body",
        content: "text",
        aiProvider: "openai",
        createdAt: ts,
      })
    ).toThrow();
  });
});

// ── ABTestSchema ─────────────────────────────────────────────────────────

describe("ABTestSchema", () => {
  const validTest = {
    campaignId: "c1",
    name: "Headline Test",
    status: "running" as const,
    creativeAId: "ca1",
    creativeBId: "cb1",
    splitPercent: 50,
    startDate: "2024-01-01",
    createdAt: ts,
    updatedAt: ts,
  };

  it("accepts valid A/B test", () => {
    expect(ABTestSchema.parse(validTest)).toBeDefined();
  });

  it("rejects splitPercent > 100", () => {
    expect(() =>
      ABTestSchema.parse({ ...validTest, splitPercent: 150 })
    ).toThrow();
  });

  it("rejects invalid status enum", () => {
    expect(() =>
      ABTestSchema.parse({ ...validTest, status: "draft" })
    ).toThrow();
  });

  it("accepts with results optional", () => {
    const withResults = {
      ...validTest,
      results: {
        aMetrics: { impressions: 1000, clicks: 50, conversions: 5, ctr: 5, conversionRate: 10 },
        bMetrics: { impressions: 1000, clicks: 45, conversions: 3, ctr: 4.5, conversionRate: 6.7 },
        statisticallySignificant: false,
        pValue: 0.15,
      },
    };
    expect(ABTestSchema.parse(withResults)).toBeDefined();
  });
});

// ── PriceRuleSchema ──────────────────────────────────────────────────────

describe("PriceRuleSchema", () => {
  const validRule = {
    productTitle: "Widget",
    myPrice: 29.99,
    cost: 10,
    floorPrice: 15,
    minMargin: 20,
    strategy: "match_lowest" as const,
    strategyConfig: { undercutPercent: 5 },
    platforms: ["shopify"],
    competitorUrls: ["https://competitor.com/p1"],
  };

  it("accepts valid price rule", () => {
    expect(PriceRuleSchema.parse(validRule)).toBeDefined();
  });

  it("rejects invalid strategy enum", () => {
    expect(() =>
      PriceRuleSchema.parse({ ...validRule, strategy: "dynamic" })
    ).toThrow();
  });

  it("rejects empty platforms array", () => {
    expect(() =>
      PriceRuleSchema.parse({ ...validRule, platforms: [] })
    ).toThrow();
  });

  it("rejects minMargin > 100", () => {
    expect(() =>
      PriceRuleSchema.parse({ ...validRule, minMargin: 150 })
    ).toThrow();
  });
});

// ── ShippingPreferencesDocSchema ─────────────────────────────────────────

describe("ShippingPreferencesDocSchema", () => {
  const validPrefs = {
    userId: "u1",
    defaultOptimization: "balanced" as const,
    defaultMaxBudget: 50,
    defaultMaxDeliveryDays: 14,
    preferredCarriers: ["cj" as const, "epacket" as const],
    excludedCarriers: ["dhl" as const],
    requireTracking: true,
    requireInsurance: false,
    autoSelectEnabled: true,
    createdAt: ts,
    updatedAt: ts,
  };

  it("accepts valid shipping preferences", () => {
    expect(ShippingPreferencesDocSchema.parse(validPrefs)).toBeDefined();
  });

  it("rejects invalid defaultOptimization enum", () => {
    expect(() =>
      ShippingPreferencesDocSchema.parse({ ...validPrefs, defaultOptimization: "fastest" })
    ).toThrow();
  });

  it("rejects invalid carrier enum", () => {
    expect(() =>
      ShippingPreferencesDocSchema.parse({
        ...validPrefs,
        preferredCarriers: ["ups" as any],
      })
    ).toThrow();
  });

  it("rejects defaultMaxDeliveryDays > 90", () => {
    expect(() =>
      ShippingPreferencesDocSchema.parse({ ...validPrefs, defaultMaxDeliveryDays: 100 })
    ).toThrow();
  });
});

// ── ProductInputSchema ───────────────────────────────────────────────────

describe("ProductInputSchema", () => {
  const validProduct = {
    title: "Wireless Headphones",
    description: "Noise cancelling bluetooth headphones",
    price: 49.99,
    category: "Electronics",
    images: ["https://img.com/h1.jpg"],
    specifications: { color: "black", weight: "200g" },
  };

  it("accepts valid product input", () => {
    expect(ProductInputSchema.parse(validProduct)).toBeDefined();
  });

  it("rejects empty title", () => {
    expect(() =>
      ProductInputSchema.parse({ ...validProduct, title: "" })
    ).toThrow();
  });

  it("rejects negative price", () => {
    expect(() =>
      ProductInputSchema.parse({ ...validProduct, price: -5 })
    ).toThrow();
  });

  it("rejects invalid image URLs", () => {
    expect(() =>
      ProductInputSchema.parse({
        ...validProduct,
        images: ["not-a-url"],
      })
    ).toThrow();
  });

  it("accepts with optional dimensions", () => {
    const withDims = {
      ...validProduct,
      weight: 0.2,
      dimensions: { length: 20, width: 15, height: 5 },
      supplierUrl: "https://supplier.com/p1",
    };
    expect(ProductInputSchema.parse(withDims)).toBeDefined();
  });
});

// ── ListingGenerationInputSchema ─────────────────────────────────────────

describe("ListingGenerationInputSchema", () => {
  const validInput = {
    product: {
      title: "Widget",
      description: "A great widget",
      price: 29.99,
      category: "Home",
      images: ["https://img.com/w1.jpg"],
      specifications: { color: "white" },
    },
    platform: "amazon" as const,
  };

  it("accepts valid listing generation input", () => {
    expect(ListingGenerationInputSchema.parse(validInput)).toBeDefined();
  });

  it("rejects invalid platform enum", () => {
    expect(() =>
      ListingGenerationInputSchema.parse({ ...validInput, platform: "wix" })
    ).toThrow();
  });

  it("accepts with optional tone and targetAudience", () => {
    const withOptions = {
      ...validInput,
      tone: "luxury" as const,
      targetAudience: "Affluent millennials",
      competitorListings: [{ title: "Comp1", price: 35 }],
    };
    expect(ListingGenerationInputSchema.parse(withOptions)).toBeDefined();
  });

  it("rejects invalid tone enum", () => {
    expect(() =>
      ListingGenerationInputSchema.parse({ ...validInput, tone: "aggressive" })
    ).toThrow();
  });
});

// ── TrendSignalSchema ───────────────────────────────────────────────────

describe("TrendSignalSchema", () => {
  const validSignal = {
    platform: "tiktok" as const,
    keyword: "portable blender",
    category: "Kitchen",
    volume: 50000,
    previousVolume: 30000,
    growthRate: 66.7,
    direction: "rising" as const,
    velocity: 1.5,
    acceleration: 0.3,
    saturationLevel: 25,
  };

  it("accepts valid trend signal", () => {
    expect(TrendSignalSchema.parse(validSignal)).toBeDefined();
  });

  it("rejects invalid platform enum", () => {
    expect(() =>
      TrendSignalSchema.parse({ ...validSignal, platform: "youtube" })
    ).toThrow();
  });

  it("rejects invalid direction enum", () => {
    expect(() =>
      TrendSignalSchema.parse({ ...validSignal, direction: "unknown" })
    ).toThrow();
  });

  it("rejects saturationLevel > 100", () => {
    expect(() =>
      TrendSignalSchema.parse({ ...validSignal, saturationLevel: 110 })
    ).toThrow();
  });
});

// ── TrendPredictionSchema ───────────────────────────────────────────────

describe("TrendPredictionSchema", () => {
  const validPrediction = {
    productIdea: "Smart water bottle",
    category: "Kitchen",
    trendScore: 85,
    confidence: "high" as const,
    direction: "rising" as const,
    predictedPeak: "2024-06",
    timeToPeak: "3 months",
    saturationRisk: 30,
    competitionLevel: "medium" as const,
    reasoning: "Strong social media traction",
    relatedKeywords: ["smart bottle", "hydration tracker"],
    suggestedPlatforms: ["amazon", "shopify"],
    estimatedMargin: 35,
  };

  it("accepts valid prediction", () => {
    expect(TrendPredictionSchema.parse(validPrediction)).toBeDefined();
  });

  it("rejects invalid confidence enum", () => {
    expect(() =>
      TrendPredictionSchema.parse({ ...validPrediction, confidence: "very_high" })
    ).toThrow();
  });

  it("rejects invalid competitionLevel enum", () => {
    expect(() =>
      TrendPredictionSchema.parse({ ...validPrediction, competitionLevel: "extreme" })
    ).toThrow();
  });

  it("rejects trendScore > 100", () => {
    expect(() =>
      TrendPredictionSchema.parse({ ...validPrediction, trendScore: 150 })
    ).toThrow();
  });
});

// ── RisingStarSchema ─────────────────────────────────────────────────────

describe("RisingStarSchema", () => {
  const validStar = {
    productKeyword: "pet camera",
    category: "Pet Supplies",
    growthVelocity: 2.5,
    competitionScore: 35,
    opportunityScore: 80,
    currentVolume: 20000,
    platforms: ["tiktok" as const, "instagram" as const],
    status: "emerging" as const,
    reasoning: "Low competition, high growth",
  };

  it("accepts valid rising star", () => {
    expect(RisingStarSchema.parse(validStar)).toBeDefined();
  });

  it("rejects invalid status enum", () => {
    expect(() =>
      RisingStarSchema.parse({ ...validStar, status: "dead" })
    ).toThrow();
  });

  it("rejects invalid platform enum in array", () => {
    expect(() =>
      RisingStarSchema.parse({
        ...validStar,
        platforms: ["tiktok", "youtube" as any],
      })
    ).toThrow();
  });

  it("accepts with optional peakVolume", () => {
    const withPeak = { ...validStar, peakVolume: 50000 };
    expect(RisingStarSchema.parse(withPeak)).toBeDefined();
  });
});

// ── AddFavoriteInputSchema ──────────────────────────────────────────────

describe("AddFavoriteInputSchema", () => {
  it("accepts valid input", () => {
    expect(
      AddFavoriteInputSchema.parse({ type: "product", itemId: "p1", title: "Widget" })
    ).toBeDefined();
  });

  it("rejects empty itemId", () => {
    expect(() =>
      AddFavoriteInputSchema.parse({ type: "product", itemId: "", title: "Widget" })
    ).toThrow();
  });

  it("rejects title > 500 chars", () => {
    expect(() =>
      AddFavoriteInputSchema.parse({ type: "product", itemId: "p1", title: "x".repeat(501) })
    ).toThrow();
  });

  it("rejects invalid type", () => {
    expect(() =>
      AddFavoriteInputSchema.parse({ type: "store", itemId: "p1", title: "W" })
    ).toThrow();
  });
});

// ── AddAlertInputSchema ──────────────────────────────────────────────────

describe("AddAlertInputSchema", () => {
  it("accepts valid input", () => {
    expect(
      AddAlertInputSchema.parse({
        type: "warning",
        title: "Stock low",
        description: "Item running out",
        read: false,
        confidence: 0.8,
      })
    ).toBeDefined();
  });

  it("rejects empty title", () => {
    expect(() =>
      AddAlertInputSchema.parse({
        type: "warning",
        title: "",
        description: "Desc",
        read: false,
      })
    ).toThrow();
  });

  it("rejects confidence > 1", () => {
    expect(() =>
      AddAlertInputSchema.parse({
        type: "info",
        title: "T",
        description: "D",
        read: false,
        confidence: 1.5,
      })
    ).toThrow();
  });

  it("rejects description > 2000 chars", () => {
    expect(() =>
      AddAlertInputSchema.parse({
        type: "info",
        title: "T",
        description: "x".repeat(2001),
        read: false,
      })
    ).toThrow();
  });
});

// ── AddRevenueEntryInputSchema ──────────────────────────────────────────

describe("AddRevenueEntryInputSchema", () => {
  it("accepts valid input", () => {
    expect(
      AddRevenueEntryInputSchema.parse({
        date: "2024-01-15",
        amount: 500,
        orders: 10,
        profit: 100,
      })
    ).toBeDefined();
  });

  it("rejects negative amount", () => {
    expect(() =>
      AddRevenueEntryInputSchema.parse({ date: "2024-01-15", amount: -50, orders: 10 })
    ).toThrow();
  });

  it("rejects non-integer orders", () => {
    expect(() =>
      AddRevenueEntryInputSchema.parse({ date: "2024-01-15", amount: 500, orders: 10.5 })
    ).toThrow();
  });

  it("accepts without optional fields", () => {
    const entry = AddRevenueEntryInputSchema.parse({
      date: "2024-01-15",
      amount: 100,
      orders: 5,
    });
    expect(entry.productTitle).toBeUndefined();
    expect(entry.platform).toBeUndefined();
  });
});

// ── AddCostProfileInputSchema ──────────────────────────────────────────

describe("AddCostProfileInputSchema", () => {
  it("accepts valid input", () => {
    expect(
      AddCostProfileInputSchema.parse({
        productId: "p1",
        productTitle: "Widget",
        cogs: 5,
        shippingCost: 3,
        platformFeePercent: 15,
        paymentProcessingPercent: 2.9,
        packagingCost: 0.5,
        otherCosts: 1,
      })
    ).toBeDefined();
  });

  it("rejects platformFeePercent > 100", () => {
    expect(() =>
      AddCostProfileInputSchema.parse({
        productId: "p1",
        productTitle: "W",
        cogs: 5,
        shippingCost: 3,
        platformFeePercent: 150,
        paymentProcessingPercent: 2.9,
        packagingCost: 0.5,
        otherCosts: 1,
      })
    ).toThrow();
  });

  it("rejects negative cogs", () => {
    expect(() =>
      AddCostProfileInputSchema.parse({
        productId: "p1",
        productTitle: "W",
        cogs: -5,
        shippingCost: 3,
        platformFeePercent: 15,
        paymentProcessingPercent: 2.9,
        packagingCost: 0.5,
        otherCosts: 1,
      })
    ).toThrow();
  });
});

// ── AddProfitEntryInputSchema ──────────────────────────────────────────

describe("AddProfitEntryInputSchema", () => {
  it("accepts valid input", () => {
    expect(
      AddProfitEntryInputSchema.parse({
        orderId: "ORD-001",
        date: "2024-01-15",
        productTitle: "Widget",
        platform: "shopify",
        revenue: 100,
        cogs: 30,
        shippingCost: 10,
        platformFee: 15,
        paymentProcessing: 3,
        refunds: 0,
        adSpend: 5,
        netProfit: 37,
        profitMargin: 37,
      })
    ).toBeDefined();
  });

  it("rejects empty orderId", () => {
    expect(() =>
      AddProfitEntryInputSchema.parse({
        orderId: "",
        date: "2024-01-15",
        productTitle: "W",
        platform: "shopify",
        revenue: 100,
        cogs: 30,
        shippingCost: 10,
        platformFee: 15,
        paymentProcessing: 3,
        refunds: 0,
        adSpend: 5,
        netProfit: 37,
        profitMargin: 37,
      })
    ).toThrow();
  });

  it("rejects negative cogs", () => {
    expect(() =>
      AddProfitEntryInputSchema.parse({
        orderId: "ORD-001",
        date: "2024-01-15",
        productTitle: "W",
        platform: "shopify",
        revenue: 100,
        cogs: -30,
        shippingCost: 10,
        platformFee: 15,
        paymentProcessing: 3,
        refunds: 0,
        adSpend: 5,
        netProfit: 37,
        profitMargin: 37,
      })
    ).toThrow();
  });
});

// ── AddReturnRequestInputSchema ──────────────────────────────────────────

describe("AddReturnRequestInputSchema", () => {
  const validReturn = {
    orderId: "ORD-001",
    orderNumber: "12345",
    customerId: "c1",
    customerName: "Jane",
    customerEmail: "jane@test.com",
    items: [
      {
        productId: "p1",
        productName: "Widget",
        quantity: 1,
        unitPrice: 29.99,
        imageUrl: "https://img.com/p1.jpg",
      },
    ],
    reason: "defective" as const,
    reasonDetails: "Broken",
    supplierId: "cj",
    supplierName: "CJ",
    platform: "shopify",
    storePlatform: "shopify",
  };

  it("accepts valid return request input", () => {
    expect(AddReturnRequestInputSchema.parse(validReturn)).toBeDefined();
  });

  it("rejects invalid email", () => {
    expect(() =>
      AddReturnRequestInputSchema.parse({ ...validReturn, customerEmail: "not-email" })
    ).toThrow();
  });

  it("rejects empty items array", () => {
    expect(() =>
      AddReturnRequestInputSchema.parse({ ...validReturn, items: [] })
    ).toThrow();
  });

  it("rejects invalid reason enum", () => {
    expect(() =>
      AddReturnRequestInputSchema.parse({ ...validReturn, reason: "unknown" })
    ).toThrow();
  });
});

// ── AddAdCampaignInputSchema ─────────────────────────────────────────────

describe("AddAdCampaignInputSchema", () => {
  const validCampaign = {
    platform: "facebook" as const,
    name: "Summer Sale",
    status: "active" as const,
    productTitle: "Widget",
    dailyBudget: 50,
    startDate: "2024-01-01",
    metrics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      revenue: 0,
      roas: 0,
      cpc: 0,
      ctr: 0,
      conversionRate: 0,
    },
  };

  it("accepts valid campaign input", () => {
    expect(AddAdCampaignInputSchema.parse(validCampaign)).toBeDefined();
  });

  it("rejects empty name", () => {
    expect(() =>
      AddAdCampaignInputSchema.parse({ ...validCampaign, name: "" })
    ).toThrow();
  });

  it("rejects negative impressions", () => {
    expect(() =>
      AddAdCampaignInputSchema.parse({
        ...validCampaign,
        metrics: { ...validCampaign.metrics, impressions: -1 },
      })
    ).toThrow();
  });
});

// ── GenerateCreativeInputSchema ──────────────────────────────────────────

describe("GenerateCreativeInputSchema", () => {
  it("accepts valid input", () => {
    expect(
      GenerateCreativeInputSchema.parse({
        platform: "facebook",
        productTitle: "Widget",
        types: ["headline", "cta"],
      })
    ).toBeDefined();
  });

  it("rejects empty types array", () => {
    expect(() =>
      GenerateCreativeInputSchema.parse({
        platform: "google",
        productTitle: "W",
        types: [],
      })
    ).toThrow();
  });

  it("rejects invalid tone enum", () => {
    expect(() =>
      GenerateCreativeInputSchema.parse({
        platform: "facebook",
        productTitle: "W",
        types: ["headline"],
        tone: "aggressive",
      })
    ).toThrow();
  });

  it("rejects count > 10", () => {
    expect(() =>
      GenerateCreativeInputSchema.parse({
        platform: "facebook",
        productTitle: "W",
        types: ["headline"],
        count: 15,
      })
    ).toThrow();
  });

  it("accepts with optional providerPriority", () => {
    const withPriority = {
      platform: "google" as const,
      productTitle: "Widget",
      types: ["body" as const],
      providerPriority: [{ id: "openai", active: true, priority: 1 }],
    };
    expect(GenerateCreativeInputSchema.parse(withPriority)).toBeDefined();
  });
});

// ── AddPriceRuleInputSchema (alias of PriceRuleSchema) ───────────────────

describe("AddPriceRuleInputSchema", () => {
  const validRule = {
    productTitle: "Widget",
    myPrice: 29.99,
    cost: 10,
    floorPrice: 15,
    minMargin: 20,
    strategy: "undercut_percent" as const,
    strategyConfig: { undercutPercent: 5, belowPercent: 3, targetMargin: 25 },
    platforms: ["shopify"],
    competitorUrls: ["https://comp.com/p1"],
  };

  it("accepts valid price rule input", () => {
    expect(AddPriceRuleInputSchema.parse(validRule)).toBeDefined();
  });

  it("rejects undercutPercent > 50", () => {
    expect(() =>
      AddPriceRuleInputSchema.parse({
        ...validRule,
        strategyConfig: { undercutPercent: 60 },
      })
    ).toThrow();
  });

  it("rejects floorPrice < 0", () => {
    expect(() =>
      AddPriceRuleInputSchema.parse({ ...validRule, floorPrice: -5 })
    ).toThrow();
  });
});

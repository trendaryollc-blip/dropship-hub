import { describe, it, expect, vi } from "vitest";
import type {
  BillingTier,
  BillingPlan,
  BillingFeature,
  BillingLimits,
  UsageMetric,
  Subscription,
  Invoice,
} from "./types";
import {
  BILLING_PLANS,
  getPlanByTier,
  canAccessFeature,
  getUsageLimit,
} from "./types";

describe("Billing Types", () => {
  it("defines all billing tiers", () => {
    const tiers: BillingTier[] = ["free", "pro", "enterprise"];
    for (const tier of tiers) {
      expect(["free", "pro", "enterprise"]).toContain(tier);
    }
  });

  it("defines all usage metrics", () => {
    const metrics: UsageMetric[] = ["ai_calls", "api_calls", "webhook_calls", "products", "store_pushes"];
    for (const metric of metrics) {
      expect(["ai_calls", "api_calls", "webhook_calls", "products", "store_pushes"]).toContain(metric);
    }
  });
});

describe("BILLING_PLANS", () => {
  it("has all three plans", () => {
    expect(BILLING_PLANS.length).toBe(3);
    expect(BILLING_PLANS.map((p) => p.tier)).toEqual(["free", "pro", "enterprise"]);
  });

  it("free plan has zero price", () => {
    const freePlan = BILLING_PLANS.find((p) => p.tier === "free")!;
    expect(freePlan.priceMonthly).toBe(0);
    expect(freePlan.priceYearly).toBe(0);
  });

  it("pro plan has correct pricing", () => {
    const proPlan = BILLING_PLANS.find((p) => p.tier === "pro")!;
    expect(proPlan.priceMonthly).toBe(49);
    expect(proPlan.priceYearly).toBe(470);
  });

  it("enterprise plan has correct pricing", () => {
    const enterprisePlan = BILLING_PLANS.find((p) => p.tier === "enterprise")!;
    expect(enterprisePlan.priceMonthly).toBe(199);
    expect(enterprisePlan.priceYearly).toBe(1910);
  });

  it("each plan has features", () => {
    for (const plan of BILLING_PLANS) {
      expect(plan.features.length).toBeGreaterThan(0);
      for (const feature of plan.features) {
        expect(feature.name).toBeTruthy();
        expect(typeof feature.included).toBe("boolean");
      }
    }
  });

  it("each plan has limits", () => {
    for (const plan of BILLING_PLANS) {
      expect(plan.limits).toBeDefined();
      expect(plan.limits.maxProducts).toBeDefined();
      expect(plan.limits.maxStores).toBeDefined();
      expect(plan.limits.maxApiCalls).toBeDefined();
      expect(plan.limits.maxWebhooks).toBeDefined();
      expect(plan.limits.maxAiCalls).toBeDefined();
      expect(plan.limits.maxTeamMembers).toBeDefined();
    }
  });

  it("enterprise plan has higher limits than pro", () => {
    const proPlan = BILLING_PLANS.find((p) => p.tier === "pro")!;
    const enterprisePlan = BILLING_PLANS.find((p) => p.tier === "enterprise")!;
    // -1 means unlimited, which is effectively higher than any finite limit
    const enterpriseProducts = enterprisePlan.limits.maxProducts === -1 ? Infinity : enterprisePlan.limits.maxProducts;
    const enterpriseStores = enterprisePlan.limits.maxStores === -1 ? Infinity : enterprisePlan.limits.maxStores;
    const enterpriseApiCalls = enterprisePlan.limits.maxApiCalls === -1 ? Infinity : enterprisePlan.limits.maxApiCalls;
    expect(enterpriseProducts).toBeGreaterThanOrEqual(proPlan.limits.maxProducts);
    expect(enterpriseStores).toBeGreaterThanOrEqual(proPlan.limits.maxStores);
    expect(enterpriseApiCalls).toBeGreaterThanOrEqual(proPlan.limits.maxApiCalls);
  });

  it("pro plan has higher limits than free", () => {
    const freePlan = BILLING_PLANS.find((p) => p.tier === "free")!;
    const proPlan = BILLING_PLANS.find((p) => p.tier === "pro")!;
    expect(proPlan.limits.maxProducts).toBeGreaterThan(freePlan.limits.maxProducts);
    expect(proPlan.limits.maxStores).toBeGreaterThan(freePlan.limits.maxStores);
    expect(proPlan.limits.maxApiCalls).toBeGreaterThan(freePlan.limits.maxApiCalls);
  });
});

describe("getPlanByTier", () => {
  it("returns free plan for free tier", () => {
    const plan = getPlanByTier("free");
    expect(plan.tier).toBe("free");
    expect(plan.priceMonthly).toBe(0);
  });

  it("returns pro plan for pro tier", () => {
    const plan = getPlanByTier("pro");
    expect(plan.tier).toBe("pro");
    expect(plan.priceMonthly).toBe(49);
  });

  it("returns enterprise plan for enterprise tier", () => {
    const plan = getPlanByTier("enterprise");
    expect(plan.tier).toBe("enterprise");
    expect(plan.priceMonthly).toBe(199);
  });

  it("defaults to free plan for unknown tier", () => {
    const plan = getPlanByTier("unknown" as BillingTier);
    expect(plan.tier).toBe("free");
  });
});

describe("canAccessFeature", () => {
  it("free tier can access basic features", () => {
    expect(canAccessFeature("free", "Product Research")).toBe(true);
    expect(canAccessFeature("free", "Basic Monitoring")).toBe(true);
    expect(canAccessFeature("free", "AI Chat")).toBe(true);
  });

  it("free tier cannot access pro features", () => {
    expect(canAccessFeature("free", "Auto-Repricing")).toBe(false);
    expect(canAccessFeature("free", "Outgoing Webhooks")).toBe(false);
    expect(canAccessFeature("free", "Priority Support")).toBe(false);
  });

  it("pro tier can access pro features", () => {
    expect(canAccessFeature("pro", "Everything in Free")).toBe(true);
    expect(canAccessFeature("pro", "Advanced Monitoring")).toBe(true);
    expect(canAccessFeature("pro", "Auto-Repricing")).toBe(true);
    expect(canAccessFeature("pro", "Outgoing Webhooks")).toBe(true);
  });

  it("pro tier cannot access enterprise features", () => {
    expect(canAccessFeature("pro", "Custom Integrations")).toBe(false);
    expect(canAccessFeature("pro", "API Access")).toBe(false);
    expect(canAccessFeature("pro", "Dedicated Support")).toBe(false);
  });

  it("enterprise tier can access all features", () => {
    expect(canAccessFeature("enterprise", "Everything in Pro")).toBe(true);
    expect(canAccessFeature("enterprise", "Unlimited Monitoring")).toBe(true);
    expect(canAccessFeature("enterprise", "Custom Integrations")).toBe(true);
    expect(canAccessFeature("enterprise", "API Access")).toBe(true);
    expect(canAccessFeature("enterprise", "Dedicated Support")).toBe(true);
  });

  it("returns false for non-existent features", () => {
    expect(canAccessFeature("free", "Non-existent Feature")).toBe(false);
    expect(canAccessFeature("pro", "Non-existent Feature")).toBe(false);
    expect(canAccessFeature("enterprise", "Non-existent Feature")).toBe(false);
  });
});

describe("getUsageLimit", () => {
  it("returns correct AI call limits", () => {
    expect(getUsageLimit("free", "ai_calls")).toBe(100);
    expect(getUsageLimit("pro", "ai_calls")).toBe(1000);
    expect(getUsageLimit("enterprise", "ai_calls")).toBe(-1);
  });

  it("returns correct API call limits", () => {
    expect(getUsageLimit("free", "api_calls")).toBe(1000);
    expect(getUsageLimit("pro", "api_calls")).toBe(10000);
    expect(getUsageLimit("enterprise", "api_calls")).toBe(100000);
  });

  it("returns correct webhook call limits", () => {
    expect(getUsageLimit("free", "webhook_calls")).toBe(3);
    expect(getUsageLimit("pro", "webhook_calls")).toBe(50);
    expect(getUsageLimit("enterprise", "webhook_calls")).toBe(200);
  });

  it("returns correct product limits", () => {
    expect(getUsageLimit("free", "products")).toBe(50);
    expect(getUsageLimit("pro", "products")).toBe(1000);
    expect(getUsageLimit("enterprise", "products")).toBe(-1);
  });

  it("returns correct store push limits", () => {
    expect(getUsageLimit("free", "store_pushes")).toBe(1000);
    expect(getUsageLimit("pro", "store_pushes")).toBe(10000);
    expect(getUsageLimit("enterprise", "store_pushes")).toBe(100000);
  });
});

describe("Subscription Interface", () => {
  it("has all required fields", () => {
    const sub: Subscription = {
      id: "sub-123",
      uid: "user-1",
      stripeCustomerId: "cus-123",
      stripeSubscriptionId: "sub-123",
      tier: "pro",
      status: "active",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(sub.id).toBe("sub-123");
    expect(sub.tier).toBe("pro");
    expect(sub.status).toBe("active");
    expect(sub.cancelAtPeriodEnd).toBe(false);
  });
});

describe("Invoice Interface", () => {
  it("has all required fields", () => {
    const invoice: Invoice = {
      id: "inv-123",
      uid: "user-1",
      stripeInvoiceId: "inv-123",
      amount: 4900,
      currency: "usd",
      status: "paid",
      invoiceUrl: "https://invoice.stripe.com/123",
      createdAt: new Date().toISOString(),
    };

    expect(invoice.amount).toBe(4900);
    expect(invoice.currency).toBe("usd");
    expect(invoice.status).toBe("paid");
  });
});

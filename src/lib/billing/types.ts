export type BillingTier = "free" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "unpaid";

export interface Subscription {
  id: string;
  uid: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  tier: BillingTier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingPlan {
  tier: BillingTier;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  features: BillingFeature[];
  limits: BillingLimits;
}

export interface BillingFeature {
  name: string;
  included: boolean;
  limit?: number;
}

export interface BillingLimits {
  maxProducts: number;
  maxStores: number;
  maxApiCalls: number;
  maxWebhooks: number;
  maxAiCalls: number;
  maxTeamMembers: number;
}

export interface UsageRecord {
  uid: string;
  metric: UsageMetric;
  quantity: number;
  timestamp: string;
}

export type UsageMetric = "ai_calls" | "api_calls" | "webhook_calls" | "products" | "store_pushes";

export interface Invoice {
  id: string;
  uid: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: string;
  invoiceUrl: string;
  createdAt: string;
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    tier: "free",
    name: "Free",
    description: "For getting started with dropshipping",
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: "",
    stripePriceIdYearly: "",
    features: [
      { name: "Product Research", included: true },
      { name: "Basic Monitoring", included: true, limit: 10 },
      { name: "AI Chat", included: true, limit: 30 },
      { name: "1 Store Connection", included: true },
      { name: "Email Support", included: true },
    ],
    limits: {
      maxProducts: 50,
      maxStores: 1,
      maxApiCalls: 1000,
      maxWebhooks: 3,
      maxAiCalls: 100,
      maxTeamMembers: 1,
    },
  },
  {
    tier: "pro",
    name: "Pro",
    description: "For serious dropshippers",
    priceMonthly: 49,
    priceYearly: 470,
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "",
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || "",
    features: [
      { name: "Everything in Free", included: true },
      { name: "Advanced Monitoring", included: true, limit: 500 },
      { name: "AI Chat", included: true, limit: 500 },
      { name: "5 Store Connections", included: true },
      { name: "Auto-Repricing", included: true },
      { name: "Outgoing Webhooks", included: true, limit: 50 },
      { name: "Priority Support", included: true },
    ],
    limits: {
      maxProducts: 1000,
      maxStores: 5,
      maxApiCalls: 10000,
      maxWebhooks: 50,
      maxAiCalls: 1000,
      maxTeamMembers: 5,
    },
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    description: "For teams and agencies",
    priceMonthly: 199,
    priceYearly: 1910,
    stripePriceIdMonthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || "",
    stripePriceIdYearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || "",
    features: [
      { name: "Everything in Pro", included: true },
      { name: "Unlimited Monitoring", included: true },
      { name: "Unlimited AI Chat", included: true },
      { name: "Unlimited Stores", included: true },
      { name: "Custom Integrations", included: true },
      { name: "API Access", included: true },
      { name: "Dedicated Support", included: true },
      { name: "Custom Webhooks", included: true, limit: 200 },
    ],
    limits: {
      maxProducts: -1,
      maxStores: -1,
      maxApiCalls: 100000,
      maxWebhooks: 200,
      maxAiCalls: -1,
      maxTeamMembers: -1,
    },
  },
];

export function getPlanByTier(tier: BillingTier): BillingPlan {
  return BILLING_PLANS.find((p) => p.tier === tier) || BILLING_PLANS[0];
}

export function canAccessFeature(tier: BillingTier, featureName: string): boolean {
  const plan = getPlanByTier(tier);
  const feature = plan.features.find((f) => f.name === featureName);
  return feature?.included ?? false;
}

export function getUsageLimit(tier: BillingTier, metric: UsageMetric): number {
  const plan = getPlanByTier(tier);
  switch (metric) {
    case "ai_calls":
      return plan.limits.maxAiCalls;
    case "api_calls":
      return plan.limits.maxApiCalls;
    case "webhook_calls":
      return plan.limits.maxWebhooks;
    case "products":
      return plan.limits.maxProducts;
    case "store_pushes":
      return plan.limits.maxApiCalls;
    default:
      return 0;
  }
}

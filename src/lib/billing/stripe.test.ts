import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockStripeInstance = {
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue({ id: "cs-123", url: "https://checkout.stripe.com/123" }),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/123" }),
    },
  },
  subscriptions: {
    retrieve: vi.fn().mockResolvedValue({
      id: "sub-123",
      status: "active",
      current_period_start: Date.now() / 1000,
      current_period_end: Date.now() / 1000 + 30 * 24 * 60 * 60,
      cancel_at_period_end: false,
      metadata: { uid: "user-1", tier: "pro" },
    }),
  },
  customers: {
    create: vi.fn().mockResolvedValue({ id: "cus-123" }),
  },
  invoices: {
    create: vi.fn().mockResolvedValue({
      id: "inv-123",
      status: "paid",
      hosted_invoice_url: "https://invoice.stripe.com/123",
    }),
  },
  webhooks: {
    constructEvent: vi.fn().mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs-123", customer: "cus-123", subscription: "sub-123", metadata: { uid: "user-1", tier: "pro" } } },
    }),
  },
};

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => mockStripeInstance),
}));

process.env.STRIPE_SECRET_KEY = "sk_test_fake_key";

import {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createCustomerPortalSession,
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  trackUsage,
  getUsage,
  getUserSubscription,
  getUserTier,
  getInvoices,
} from "./stripe";

describe("Stripe Billing Service", () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      collection: vi.fn().mockReturnThis(),
      doc: vi.fn().mockReturnThis(),
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      add: vi.fn().mockResolvedValue({ id: "usage-123" }),
    };
    mockDb.where.mockReturnValue(mockDb);
    mockDb.limit.mockReturnValue(mockDb);
    mockDb.orderBy.mockReturnValue(mockDb);
  });

  describe("getOrCreateStripeCustomer", () => {
    it("creates new customer when none exists", async () => {
      const mockSnap = { exists: false };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const customerId = await getOrCreateStripeCustomer("user-1", "test@example.com");
      expect(customerId).toBe("cus-123");
      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: "test@example.com",
        metadata: { uid: "user-1" },
      });
    });

    it("returns existing customer ID", async () => {
      const mockSnap = {
        exists: true,
        data: () => ({ stripeCustomerId: "cus-existing" }),
      };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const customerId = await getOrCreateStripeCustomer("user-1", "test@example.com");
      expect(customerId).toBe("cus-existing");
    });
  });

  describe("createCheckoutSession", () => {
    it("creates checkout session", async () => {
      const mockSnap = { exists: false };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const result = await createCheckoutSession("user-1", "test@example.com", "price_123", "pro", "month");
      expect(result.sessionId).toBe("cs-123");
      expect(result.url).toBe("https://checkout.stripe.com/123");
    });
  });

  describe("createCustomerPortalSession", () => {
    it("creates portal session", async () => {
      const mockSnap = {
        exists: true,
        data: () => ({ stripeCustomerId: "cus-123" }),
      };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const result = await createCustomerPortalSession("user-1");
      expect(result.url).toBe("https://billing.stripe.com/123");
    });

    it("throws when no customer found", async () => {
      const mockSnap = { exists: false };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      await expect(createCustomerPortalSession("user-1")).rejects.toThrow("No Stripe customer found");
    });
  });

  describe("handleCheckoutCompleted", () => {
    it("creates subscription record", async () => {
      const mockSession = {
        metadata: { uid: "user-1", tier: "pro" },
        customer: "cus-123",
        subscription: "sub-123",
      };

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      await handleCheckoutCompleted(mockSession as any);
      expect(mockDb.set).toHaveBeenCalled();
    });

    it("handles missing metadata gracefully", async () => {
      const mockSession = { metadata: {} };

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      await handleCheckoutCompleted(mockSession as any);
      expect(mockDb.set).not.toHaveBeenCalled();
    });
  });

  describe("handleSubscriptionUpdated", () => {
    it("updates subscription record", async () => {
      const mockSubscription = {
        id: "sub-123",
        status: "active",
        current_period_start: Date.now() / 1000,
        current_period_end: Date.now() / 1000 + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        metadata: { uid: "user-1" },
      };

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      await handleSubscriptionUpdated(mockSubscription as any);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe("handleSubscriptionDeleted", () => {
    it("marks subscription as canceled", async () => {
      const mockSubscription = {
        id: "sub-123",
        metadata: { uid: "user-1" },
      };

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      await handleSubscriptionDeleted(mockSubscription as any);
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "canceled" })
      );
    });
  });

  describe("trackUsage", () => {
    it("tracks usage record", async () => {
      const mockUsageSnap = { docs: [] };
      mockDb.get.mockResolvedValue(mockUsageSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      await trackUsage("user-1", "ai_calls", 1);
      expect(mockDb.set).toHaveBeenCalled();
    });
  });

  describe("getUsage", () => {
    it("returns usage count", async () => {
      const mockSnap = {
        docs: [
          { data: () => ({ quantity: 5 }) },
          { data: () => ({ quantity: 3 }) },
        ],
      };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const usage = await getUsage("user-1", "ai_calls");
      expect(usage).toBe(8);
    });

    it("returns 0 on error", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockRejectedValue(new Error("DB error"));

      const usage = await getUsage("user-1", "ai_calls");
      expect(usage).toBe(0);
    });
  });

  describe("getUserSubscription", () => {
    it("returns subscription data", async () => {
      const mockSnap = {
        exists: true,
        data: () => ({
          uid: "user-1",
          tier: "pro",
          status: "active",
        }),
      };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const sub = await getUserSubscription("user-1");
      expect(sub).toBeTruthy();
      expect(sub?.tier).toBe("pro");
    });

    it("returns null when no subscription", async () => {
      const mockSnap = { exists: false };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const sub = await getUserSubscription("user-1");
      expect(sub).toBeNull();
    });

    it("returns null on error", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockRejectedValue(new Error("DB error"));

      const sub = await getUserSubscription("user-1");
      expect(sub).toBeNull();
    });
  });

  describe("getUserTier", () => {
    it("returns tier from active subscription", async () => {
      const mockSnap = {
        exists: true,
        data: () => ({
          tier: "pro",
          status: "active",
        }),
      };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const tier = await getUserTier("user-1");
      expect(tier).toBe("pro");
    });

    it("returns free when no subscription", async () => {
      const mockSnap = { exists: false };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const tier = await getUserTier("user-1");
      expect(tier).toBe("free");
    });

    it("returns free when subscription is canceled", async () => {
      const mockSnap = {
        exists: true,
        data: () => ({
          tier: "pro",
          status: "canceled",
        }),
      };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const tier = await getUserTier("user-1");
      expect(tier).toBe("free");
    });
  });

  describe("getInvoices", () => {
    it("returns invoices for a user", async () => {
      const mockSnap = {
        docs: [
          {
            data: () => ({
              id: "inv-1",
              amount: 4900,
              currency: "usd",
              status: "paid",
            }),
          },
        ],
      };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const invoices = await getInvoices("user-1");
      expect(invoices.length).toBe(1);
      expect(invoices[0].amount).toBe(4900);
    });

    it("returns empty array on error", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockRejectedValue(new Error("DB error"));

      const invoices = await getInvoices("user-1");
      expect(invoices).toEqual([]);
    });
  });
});

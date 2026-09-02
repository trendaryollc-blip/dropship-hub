import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  silentCatch: vi.fn(),
}));

import { dispatchNotifications } from "@/lib/monitoring/notification-dispatcher";
import type { NotificationPayload } from "@/lib/monitoring/types";

const mockGetAdminDB = vi.fn();

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: (...args: unknown[]) => mockGetAdminDB(...args),
}));

describe("notification-dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  const basePayload: NotificationPayload = {
    type: "price_drop",
    productTitle: "Test Product",
    productId: "prod1",
    oldPrice: 50,
    newPrice: 40,
    message: "Price dropped from $50 to $40",
  };

  describe("dispatchNotifications", () => {
    it("dispatches notifications when preferences allow", async () => {
      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              doc: () => ({
                get: vi.fn().mockResolvedValue({
                  exists: true,
                  data: () => ({ priceAlerts: true, stockAlerts: true }),
                }),
              }),
              add: vi.fn().mockResolvedValue({}),
            }),
          }),
        }),
      });

      const result = await dispatchNotifications("user1", [basePayload]);
      expect(result.dispatched).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it("skips notifications when preferences disable them", async () => {
      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              doc: () => ({
                get: vi.fn().mockResolvedValue({
                  exists: true,
                  data: () => ({ priceAlerts: false, stockAlerts: true }),
                }),
              }),
              add: vi.fn().mockResolvedValue({}),
            }),
          }),
        }),
      });

      const result = await dispatchNotifications("user1", [basePayload]);
      expect(result.dispatched).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("dispatches stock alerts when stockAlerts enabled", async () => {
      const stockPayload: NotificationPayload = {
        type: "out_of_stock",
        productTitle: "Out of Stock Product",
        productId: "prod2",
        message: "Product is out of stock",
      };

      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              doc: () => ({
                get: vi.fn().mockResolvedValue({
                  exists: true,
                  data: () => ({ priceAlerts: true, stockAlerts: true }),
                }),
              }),
              add: vi.fn().mockResolvedValue({}),
            }),
          }),
        }),
      });

      const result = await dispatchNotifications("user1", [stockPayload]);
      expect(result.dispatched).toBe(1);
    });

    it("handles multiple notifications", async () => {
      const payloads: NotificationPayload[] = [
        { ...basePayload, type: "price_drop" },
        { ...basePayload, type: "price_increase", message: "Price increased" },
        { ...basePayload, type: "out_of_stock", message: "Out of stock" },
      ];

      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              doc: () => ({
                get: vi.fn().mockResolvedValue({
                  exists: true,
                  data: () => ({ priceAlerts: true, stockAlerts: true }),
                }),
              }),
              add: vi.fn().mockResolvedValue({}),
            }),
          }),
        }),
      });

      const result = await dispatchNotifications("user1", payloads);
      expect(result.dispatched).toBe(3);
    });

    it("uses defaults when no preferences exist", async () => {
      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              doc: () => ({
                get: vi.fn().mockResolvedValue({
                  exists: false,
                  data: () => null,
                }),
              }),
              add: vi.fn().mockResolvedValue({}),
            }),
          }),
        }),
      });

      const result = await dispatchNotifications("user1", [basePayload]);
      expect(result.dispatched).toBe(1);
    });
  });
});

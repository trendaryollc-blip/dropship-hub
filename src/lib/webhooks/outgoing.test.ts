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

vi.mock("@/lib/webhooks/event-log", () => ({
  logWebhookEvent: vi.fn().mockResolvedValue("log-123"),
}));

import { dispatchOutgoingWebhook, retryWebhook } from "./outgoing";
import { logWebhookEvent } from "./event-log";

describe("Outgoing Webhook Dispatcher", () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      collection: vi.fn().mockReturnThis(),
      doc: vi.fn().mockReturnThis(),
      get: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnThis(),
    };
  });

  describe("dispatchOutgoingWebhook", () => {
    it("dispatches to matching webhooks", async () => {
      const mockWebhook = {
        id: "wh-1",
        url: "https://example.com/webhook",
        events: ["order.created"],
        secret: "test-secret",
        active: true,
      };

      const mockSnap = {
        docs: [
          {
            id: "wh-1",
            data: () => mockWebhook,
            ref: { update: vi.fn().mockResolvedValue(undefined) },
          },
        ],
        empty: false,
      };

      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      } as any);

      const result = await dispatchOutgoingWebhook("user-1", "order.created", { orderId: "123" });
      expect(result.dispatched).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("skips webhooks that don't match event", async () => {
      const mockWebhook = {
        id: "wh-1",
        url: "https://example.com/webhook",
        events: ["refund.created"],
        secret: "test-secret",
        active: true,
      };

      const mockSnap = {
        docs: [
          {
            id: "wh-1",
            data: () => mockWebhook,
            ref: { update: vi.fn().mockResolvedValue(undefined) },
          },
        ],
        empty: false,
      };

      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const result = await dispatchOutgoingWebhook("user-1", "order.created", { orderId: "123" });
      expect(result.dispatched).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("handles empty webhook list", async () => {
      const mockSnap = { docs: [], empty: true };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const result = await dispatchOutgoingWebhook("user-1", "order.created", {});
      expect(result.dispatched).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("handles fetch failure", async () => {
      const mockWebhook = {
        id: "wh-1",
        url: "https://example.com/webhook",
        events: ["order.created"],
        secret: "test-secret",
        active: true,
      };

      const mockSnap = {
        docs: [
          {
            id: "wh-1",
            data: () => mockWebhook,
            ref: { update: vi.fn().mockResolvedValue(undefined) },
          },
        ],
        empty: false,
      };

      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

      const result = await dispatchOutgoingWebhook("user-1", "order.created", { orderId: "123" });
      expect(result.dispatched).toBe(0);
      expect(result.failed).toBe(1);
    });

    it("handles non-2xx response", async () => {
      const mockWebhook = {
        id: "wh-1",
        url: "https://example.com/webhook",
        events: ["order.created"],
        secret: "test-secret",
        active: true,
      };

      const mockSnap = {
        docs: [
          {
            id: "wh-1",
            data: () => mockWebhook,
            ref: { update: vi.fn().mockResolvedValue(undefined) },
          },
        ],
        empty: false,
      };

      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      } as any);

      const result = await dispatchOutgoingWebhook("user-1", "order.created", { orderId: "123" });
      expect(result.dispatched).toBe(0);
      expect(result.failed).toBe(1);
    });

    it("returns error on database failure", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockRejectedValue(new Error("DB error"));

      const result = await dispatchOutgoingWebhook("user-1", "order.created", {});
      expect(result.dispatched).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe("retryWebhook", () => {
    it("returns error when log not found", async () => {
      const mockSnap = { exists: false };
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const result = await retryWebhook("user-1", "log-123");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Log entry not found");
    });

    it("returns error when webhook not found", async () => {
      const mockLogSnap = {
        exists: true,
        data: () => ({
          webhookId: "wh-1",
          event: "order.created",
          payload: {},
        }),
      };
      const mockWebhookSnap = { exists: false };

      mockDb.get
        .mockResolvedValueOnce(mockLogSnap)
        .mockResolvedValueOnce(mockWebhookSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const result = await retryWebhook("user-1", "log-123");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Webhook not found");
    });
  });
});

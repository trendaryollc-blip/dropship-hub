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

import { getWebhookLogs, getWebhookLogStats, deleteOldWebhookLogs } from "./event-log";

describe("Webhook Event Log", () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      collection: vi.fn().mockReturnThis(),
      doc: vi.fn().mockReturnThis(),
      add: vi.fn().mockResolvedValue({ id: "log-123" }),
      get: vi.fn(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      count: vi.fn().mockReturnThis(),
      batch: vi.fn().mockReturnValue({
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }),
    };
  });

  describe("getWebhookLogs", () => {
    it("returns logs for a user", async () => {
      const mockSnap = {
        docs: [
          {
            id: "log-1",
            data: () => ({
              uid: "user-1",
              direction: "incoming",
              webhookId: "wh-1",
              event: "order.created",
              source: "shopify",
              payload: {},
              duration: 100,
              createdAt: "2026-01-01T00:00:00Z",
            }),
          },
        ],
      };

      mockDb.count.mockReturnValue({ get: vi.fn().mockResolvedValue({ data: () => ({ count: 1 }) }) });
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const result = await getWebhookLogs("user-1");
      expect(result.logs.length).toBe(1);
      expect(result.total).toBe(1);
    });

    it("returns empty logs on error", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockRejectedValue(new Error("DB error"));

      const result = await getWebhookLogs("user-1");
      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("applies direction filter", async () => {
      const mockSnap = { docs: [] };
      mockDb.count.mockReturnValue({ get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }) });
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      await getWebhookLogs("user-1", { direction: "incoming" });
      expect(mockDb.where).toHaveBeenCalledWith("direction", "==", "incoming");
    });

    it("applies webhookId filter", async () => {
      const mockSnap = { docs: [] };
      mockDb.count.mockReturnValue({ get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }) });
      mockDb.get.mockResolvedValue(mockSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      await getWebhookLogs("user-1", { webhookId: "wh-123" });
      expect(mockDb.where).toHaveBeenCalledWith("webhookId", "==", "wh-123");
    });
  });

  describe("getWebhookLogStats", () => {
    it("returns stats for a user", async () => {
      const mockCountSnap = { data: () => ({ count: 5 }) };
      const mockRecentSnap = {
        docs: [
          {
            data: () => ({
              direction: "incoming",
              duration: 100,
              error: null,
            }),
          },
          {
            data: () => ({
              direction: "outgoing",
              duration: 200,
              error: "timeout",
            }),
          },
        ],
      };

      mockDb.count.mockReturnValue({ get: vi.fn().mockResolvedValue(mockCountSnap) });
      mockDb.get.mockResolvedValue(mockRecentSnap);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const stats = await getWebhookLogStats("user-1");
      expect(stats.totalIncoming).toBe(5);
      expect(stats.totalOutgoing).toBe(5);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(1);
      expect(stats.avgDuration).toBe(150);
    });

    it("returns zero stats on error", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockRejectedValue(new Error("DB error"));

      const stats = await getWebhookLogStats("user-1");
      expect(stats.totalIncoming).toBe(0);
      expect(stats.totalOutgoing).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.avgDuration).toBe(0);
    });
  });

  describe("deleteOldWebhookLogs", () => {
    it("deletes old logs", async () => {
      const mockSnap = {
        docs: [
          { ref: { id: "log-1" } },
          { ref: { id: "log-2" } },
        ],
        size: 2,
      };

      mockDb.get.mockResolvedValue(mockSnap);
      mockDb.batch().commit.mockResolvedValue(undefined);

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(mockDb);

      const deleted = await deleteOldWebhookLogs("user-1", 30);
      expect(deleted).toBe(2);
    });

    it("returns 0 on error", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockRejectedValue(new Error("DB error"));

      const deleted = await deleteOldWebhookLogs("user-1");
      expect(deleted).toBe(0);
    });
  });
});

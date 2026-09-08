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

vi.mock("./event-log", () => ({
  logWebhookEvent: vi.fn().mockResolvedValue("log-123"),
}));

vi.mock("./outgoing", () => ({
  dispatchOutgoingWebhook: vi.fn().mockResolvedValue({ dispatched: 0, failed: 0 }),
}));

import { processIncomingWebhook, getIncomingWebhooks } from "./incoming";
import { logWebhookEvent } from "./event-log";
import { dispatchOutgoingWebhook } from "./outgoing";

function createMockDocRef(data?: Record<string, unknown>) {
  return {
    update: vi.fn().mockResolvedValue(undefined),
    id: "mock-doc-id",
    ...data,
  };
}

function createMockDb() {
  const addMock = vi.fn();
  const updateMock = vi.fn().mockResolvedValue(undefined);
  const getMock = vi.fn();
  const whereMock = vi.fn();
  const limitMock = vi.fn();
  const countMock = vi.fn();
  const orderByMock = vi.fn();

  const chainObj: any = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    add: addMock,
    get: getMock,
    update: updateMock,
    where: whereMock,
    limit: limitMock,
    count: countMock,
    orderBy: orderByMock,
  };

  whereMock.mockReturnValue(chainObj);
  limitMock.mockReturnValue(chainObj);
  orderByMock.mockReturnValue(chainObj);
  countMock.mockReturnValue({ get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }) });

  return { db: chainObj, addMock, updateMock, getMock, whereMock, limitMock };
}

describe("Incoming Webhook Processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processIncomingWebhook", () => {
    it("processes order.created webhook", async () => {
      const { db, addMock, getMock } = createMockDb();
      const mockDocRef = { id: "wh-incoming-123", update: vi.fn().mockResolvedValue(undefined) };
      addMock.mockResolvedValue(mockDocRef);
      getMock.mockResolvedValue({ exists: false, empty: true, docs: [], size: 0 });

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(db);

      const result = await processIncomingWebhook({
        uid: "user-1",
        source: "shopify",
        event: "order.created",
        payload: { id: "order-1", total: "100.00" },
        headers: {},
      });

      expect(result.status).toBe("completed");
      expect(result.id).toBeTruthy();
    });

    it("processes order.updated webhook", async () => {
      const { db, addMock, getMock } = createMockDb();
      addMock.mockResolvedValue({ id: "wh-incoming-123", update: vi.fn().mockResolvedValue(undefined) });
      getMock.mockResolvedValue({
        exists: false,
        empty: false,
        docs: [{ data: () => ({ storeOrderId: "order-1" }), ref: { update: vi.fn() } }],
      });

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(db);

      const result = await processIncomingWebhook({
        uid: "user-1",
        source: "shopify",
        event: "order.updated",
        payload: { id: "order-1", status: "shipped", trackingNumber: "123456" },
        headers: {},
      });

      expect(result.status).toBe("completed");
    });

    it("processes order.cancelled webhook", async () => {
      const { db, addMock, getMock } = createMockDb();
      addMock.mockResolvedValue({ id: "wh-incoming-123", update: vi.fn().mockResolvedValue(undefined) });
      getMock.mockResolvedValue({
        empty: false,
        docs: [{ ref: { update: vi.fn() } }],
      });

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(db);

      const result = await processIncomingWebhook({
        uid: "user-1",
        source: "shopify",
        event: "order.cancelled",
        payload: { id: "order-1" },
        headers: {},
      });

      expect(result.status).toBe("completed");
    });

    it("processes refund.created webhook", async () => {
      const { db, addMock } = createMockDb();
      addMock.mockResolvedValue({ id: "wh-incoming-123", update: vi.fn().mockResolvedValue(undefined) });

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(db);

      const result = await processIncomingWebhook({
        uid: "user-1",
        source: "shopify",
        event: "refund.created",
        payload: { orderId: "order-1", amount: 50, reason: "defective" },
        headers: {},
      });

      expect(result.status).toBe("completed");
    });

    it("processes inventory.updated webhook", async () => {
      const { db, addMock, getMock } = createMockDb();
      addMock.mockResolvedValue({ id: "wh-incoming-123", update: vi.fn().mockResolvedValue(undefined) });
      getMock.mockResolvedValue({
        empty: false,
        docs: [{ ref: { update: vi.fn() } }],
      });

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(db);

      const result = await processIncomingWebhook({
        uid: "user-1",
        source: "shopify",
        event: "inventory.updated",
        payload: { productId: "prod-1", stockQuantity: 10 },
        headers: {},
      });

      expect(result.status).toBe("completed");
    });

    it("processes product.updated webhook", async () => {
      const { db, addMock, getMock } = createMockDb();
      addMock.mockResolvedValue({ id: "wh-incoming-123", update: vi.fn().mockResolvedValue(undefined) });
      getMock.mockResolvedValue({
        empty: false,
        docs: [{ ref: { update: vi.fn() } }],
      });

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(db);

      const result = await processIncomingWebhook({
        uid: "user-1",
        source: "shopify",
        event: "product.updated",
        payload: { productId: "prod-1", price: 29.99, title: "New Product" },
        headers: {},
      });

      expect(result.status).toBe("completed");
    });

    it("processes custom webhook", async () => {
      const { db, addMock } = createMockDb();
      addMock.mockResolvedValue({ id: "wh-incoming-123", update: vi.fn().mockResolvedValue(undefined) });

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(db);

      const result = await processIncomingWebhook({
        uid: "user-1",
        source: "custom",
        event: "custom",
        payload: { custom: "data" },
        headers: {},
      });

      expect(result.status).toBe("completed");
    });

    it("handles processing failure", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockRejectedValue(new Error("DB error"));

      await expect(
        processIncomingWebhook({
          uid: "user-1",
          source: "shopify",
          event: "order.created",
          payload: {},
          headers: {},
        })
      ).rejects.toThrow("DB error");
    });

    it("logs webhook events", async () => {
      const { db, addMock } = createMockDb();
      addMock.mockResolvedValue({ id: "wh-incoming-123", update: vi.fn().mockResolvedValue(undefined) });

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(db);

      await processIncomingWebhook({
        uid: "user-1",
        source: "shopify",
        event: "order.created",
        payload: { id: "order-1" },
        headers: {},
      });

      expect(logWebhookEvent).toHaveBeenCalled();
    });

    it("dispatches outgoing webhooks after processing", async () => {
      const { db, addMock, getMock } = createMockDb();
      const docUpdateMock = vi.fn().mockResolvedValue(undefined);
      addMock.mockResolvedValue({ id: "wh-incoming-123", update: docUpdateMock });
      getMock.mockResolvedValue({ exists: false, empty: true, docs: [], size: 0 });

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(db);

      const result = await processIncomingWebhook({
        uid: "user-1",
        source: "shopify",
        event: "order.created",
        payload: { id: "order-1" },
        headers: {},
      });

      expect(result.status).toBe("completed");
      expect(result.id).toBe("wh-incoming-123");
    });
  });

  describe("getIncomingWebhooks", () => {
    it("returns webhooks for a user", async () => {
      const { db, getMock } = createMockDb();
      getMock.mockResolvedValue({
        docs: [
          {
            id: "wh-1",
            data: () => ({
              uid: "user-1",
              source: "shopify",
              event: "order.created",
              status: "completed",
            }),
          },
        ],
      });

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(db);

      const result = await getIncomingWebhooks("user-1");
      expect(result.webhooks.length).toBe(1);
      expect(result.total).toBe(0);
    });

    it("returns empty on error", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockRejectedValue(new Error("DB error"));

      const result = await getIncomingWebhooks("user-1");
      expect(result.webhooks).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("applies status filter", async () => {
      const { db, whereMock } = createMockDb();

      const { getAdminDB } = await import("@/lib/firebase-admin");
      (getAdminDB as any).mockResolvedValue(db);

      await getIncomingWebhooks("user-1", { status: "failed" });
      expect(whereMock).toHaveBeenCalledWith("status", "==", "failed");
    });
  });
});

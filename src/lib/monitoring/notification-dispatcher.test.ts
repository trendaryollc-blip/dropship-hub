import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NotificationPayload } from "./types";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { dispatchNotifications } from "./notification-dispatcher";
import { getAdminDB } from "@/lib/firebase-admin";

function createMockDb(prefs: Record<string, unknown> | null = null) {
  const settingsDoc = prefs
    ? { exists: true, data: () => prefs }
    : { exists: false, data: () => null };

  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(settingsDoc),
          }),
          add: vi.fn().mockResolvedValue({ id: "notif-id" }),
        }),
      }),
    }),
  };
}

describe("dispatchNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches when price alerts are enabled", async () => {
    const mockDb = createMockDb({ priceAlerts: true, stockAlerts: true });
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const payload: NotificationPayload = {
      type: "price_drop",
      productTitle: "Test Product",
      productId: "p1",
      oldPrice: 30,
      newPrice: 25,
      message: "Price dropped",
    };

    const result = await dispatchNotifications("uid-1", [payload]);
    expect(result.dispatched).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it("skips when price alerts are disabled", async () => {
    const mockDb = createMockDb({ priceAlerts: false, stockAlerts: true });
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const payload: NotificationPayload = {
      type: "price_drop",
      productTitle: "Test Product",
      productId: "p1",
      message: "Price dropped",
    };

    const result = await dispatchNotifications("uid-1", [payload]);
    expect(result.dispatched).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it("dispatches stock alerts when enabled", async () => {
    const mockDb = createMockDb({ priceAlerts: true, stockAlerts: true });
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const payload: NotificationPayload = {
      type: "out_of_stock",
      productTitle: "Test Product",
      productId: "p1",
      message: "Out of stock",
    };

    const result = await dispatchNotifications("uid-1", [payload]);
    expect(result.dispatched).toBe(1);
  });

  it("skips stock alerts when disabled", async () => {
    const mockDb = createMockDb({ priceAlerts: true, stockAlerts: false });
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const payload: NotificationPayload = {
      type: "out_of_stock",
      productTitle: "Test",
      productId: "p1",
      message: "Out of stock",
    };

    const result = await dispatchNotifications("uid-1", [payload]);
    expect(result.skipped).toBe(1);
  });

  it("handles multiple notifications", async () => {
    const mockDb = createMockDb({ priceAlerts: true, stockAlerts: true });
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const payloads: NotificationPayload[] = [
      { type: "price_drop", productTitle: "P1", productId: "p1", message: "Drop 1" },
      { type: "price_increase", productTitle: "P2", productId: "p2", message: "Increase" },
      { type: "out_of_stock", productTitle: "P3", productId: "p3", message: "OOS" },
    ];

    const result = await dispatchNotifications("uid-1", payloads);
    expect(result.dispatched).toBe(3);
    expect(result.skipped).toBe(0);
  });

  it("uses default preferences when settings not found", async () => {
    const mockDb = createMockDb(null);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const payload: NotificationPayload = {
      type: "competitor_undercut",
      productTitle: "Test",
      productId: "p1",
      message: "Undercut",
    };

    const result = await dispatchNotifications("uid-1", [payload]);
    expect(result.dispatched).toBe(1);
  });

  it("returns zero dispatched for empty payloads", async () => {
    const mockDb = createMockDb({ priceAlerts: true, stockAlerts: true });
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await dispatchNotifications("uid-1", []);
    expect(result.dispatched).toBe(0);
    expect(result.skipped).toBe(0);
  });
});

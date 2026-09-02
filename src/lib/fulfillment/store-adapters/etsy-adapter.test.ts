import { describe, it, expect, vi, beforeEach } from "vitest";
import { etsyAdapter } from "./etsy-adapter";
import type { StoreConfig } from "./interface";

const mockConfig: StoreConfig = {
  platform: "etsy",
  url: "https://example.etsy.com",
  apiKey: "etsy-api-key",
  apiSecret: "12345",
  accessToken: "etsy-token",
};

describe("etsyAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchOrders", () => {
    it("returns mapped orders on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  receipt_id: 999,
                  status: "paid",
                  buyer_email: "buyer@test.com",
                  create_timestamp: 1700000000,
                  grandtotal: { amount: "2500", currency_code: "USD" },
                  address: {
                    first_name: "John",
                    last_name: "Doe",
                    street1: "123 Main St",
                    city: "Springfield",
                    state: "IL",
                    zip: "62701",
                    country_code: "US",
                    phone: "555-1234",
                  },
                  transactions: [
                    {
                      listing_id: "L001",
                      title: "Etsy Widget",
                      price: { amount: "2500", currency_code: "USD" },
                      quantity: 2,
                      sku: "EW-001",
                      image: { url_170x135: "https://img.etsy.com/thumb.jpg" },
                    },
                  ],
                },
              ],
            }),
        })
      );

      const orders = await etsyAdapter.fetchOrders(mockConfig);
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe("999");
      expect(orders[0].orderNumber).toBe("#999");
      expect(orders[0].customerName).toBe("John Doe");
      expect(orders[0].status).toBe("paid");
      expect(orders[0].items).toHaveLength(1);
      expect(orders[0].items[0].name).toBe("Etsy Widget");
    });

    it("returns empty array on non-ok response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 401 })
      );

      const orders = await etsyAdapter.fetchOrders(mockConfig);
      expect(orders).toEqual([]);
    });

    it("passes since parameter to URL", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });
      vi.stubGlobal("fetch", fetchMock);

      await etsyAdapter.fetchOrders(mockConfig, "2026-01-01");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("min_created="),
        expect.anything()
      );
    });

    it("maps open status to pending", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  receipt_id: 1,
                  status: "open",
                  buyer_email: "b@t.com",
                  create_timestamp: 1700000000,
                  grandtotal: { amount: "100", currency_code: "USD" },
                  address: { first_name: "A", last_name: "B" },
                  transactions: [],
                },
              ],
            }),
        })
      );

      const orders = await etsyAdapter.fetchOrders(mockConfig);
      expect(orders[0].status).toBe("pending");
    });

    it("maps completed status to shipped", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  receipt_id: 2,
                  status: "completed",
                  buyer_email: "b@t.com",
                  create_timestamp: 1700000000,
                  grandtotal: { amount: "100", currency_code: "USD" },
                  address: { first_name: "A", last_name: "B" },
                  transactions: [],
                },
              ],
            }),
        })
      );

      const orders = await etsyAdapter.fetchOrders(mockConfig);
      expect(orders[0].status).toBe("shipped");
    });

    it("maps cancelled status to cancelled", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  receipt_id: 3,
                  status: "cancelled",
                  buyer_email: "b@t.com",
                  create_timestamp: 1700000000,
                  grandtotal: { amount: "100", currency_code: "USD" },
                  address: { first_name: "A", last_name: "B" },
                  transactions: [],
                },
              ],
            }),
        })
      );

      const orders = await etsyAdapter.fetchOrders(mockConfig);
      expect(orders[0].status).toBe("cancelled");
    });
  });

  describe("pushTracking", () => {
    it("returns true on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true })
      );

      const result = await etsyAdapter.pushTracking(mockConfig, "999", "TRACK123", "USPS");
      expect(result).toBe(true);
    });

    it("returns false on failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false })
      );

      const result = await etsyAdapter.pushTracking(mockConfig, "999", "TRACK123", "USPS");
      expect(result).toBe(false);
    });
  });

  describe("getOrderStatus", () => {
    it("returns unknown", async () => {
      const status = await etsyAdapter.getOrderStatus(mockConfig, "999");
      expect(status).toBe("unknown");
    });
  });
});

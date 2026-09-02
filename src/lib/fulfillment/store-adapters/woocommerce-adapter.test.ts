import { describe, it, expect, vi, beforeEach } from "vitest";
import { woocommerceAdapter } from "./woocommerce-adapter";
import type { StoreConfig } from "./interface";

const mockConfig: StoreConfig = {
  platform: "woocommerce",
  url: "https://woo-store.com",
  apiKey: "ck_abc",
  apiSecret: "cs_def",
};

describe("woocommerceAdapter", () => {
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
            Promise.resolve([
              {
                id: 2001,
                number: "2001",
                status: "processing",
                date_created: "2026-01-20T10:00:00Z",
                total: "79.99",
                currency: "USD",
                billing: { email: "woo@test.com", phone: "555-0000" },
                shipping: {
                  first_name: "Bob",
                  last_name: "Wilson",
                  address_1: "789 Pine St",
                  city: "Seattle",
                  state: "WA",
                  postcode: "98101",
                  country: "US",
                  phone: "555-1111",
                },
                line_items: [
                  {
                    product_id: "WP001",
                    name: "Woo Product",
                    price: "79.99",
                    quantity: 1,
                    sku: "WP-001",
                    image: { src: "https://woo-store.com/img.jpg" },
                  },
                ],
              },
            ]),
        })
      );

      const orders = await woocommerceAdapter.fetchOrders(mockConfig);
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe("2001");
      expect(orders[0].orderNumber).toBe("#2001");
      expect(orders[0].customerName).toBe("Bob Wilson");
      expect(orders[0].status).toBe("paid");
      expect(orders[0].total).toBe(79.99);
    });

    it("returns empty array on non-ok response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 401 })
      );

      const orders = await woocommerceAdapter.fetchOrders(mockConfig);
      expect(orders).toEqual([]);
    });

    it("passes since parameter", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });
      vi.stubGlobal("fetch", fetchMock);

      await woocommerceAdapter.fetchOrders(mockConfig, "2026-01-01");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("after="),
        expect.anything()
      );
    });

    it("maps pending status", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 1, number: "1", status: "pending", total: "10", currency: "USD", billing: {}, shipping: {} },
            ]),
        })
      );

      const orders = await woocommerceAdapter.fetchOrders(mockConfig);
      expect(orders[0].status).toBe("pending");
    });

    it("maps completed status to shipped", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 1, number: "1", status: "completed", total: "10", currency: "USD", billing: {}, shipping: {} },
            ]),
        })
      );

      const orders = await woocommerceAdapter.fetchOrders(mockConfig);
      expect(orders[0].status).toBe("shipped");
    });

    it("maps cancelled and refunded to cancelled", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 1, number: "1", status: "cancelled", total: "10", currency: "USD", billing: {}, shipping: {} },
              { id: 2, number: "2", status: "refunded", total: "10", currency: "USD", billing: {}, shipping: {} },
              { id: 3, number: "3", status: "failed", total: "10", currency: "USD", billing: {}, shipping: {} },
            ]),
        })
      );

      const orders = await woocommerceAdapter.fetchOrders(mockConfig);
      expect(orders[0].status).toBe("cancelled");
      expect(orders[1].status).toBe("cancelled");
      expect(orders[2].status).toBe("cancelled");
    });
  });

  describe("pushTracking", () => {
    it("returns true on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true })
      );

      const result = await woocommerceAdapter.pushTracking(mockConfig, "2001", "TRACK456", "UPS");
      expect(result).toBe(true);
    });

    it("returns false on failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false })
      );

      const result = await woocommerceAdapter.pushTracking(mockConfig, "2001", "TRACK456", "UPS");
      expect(result).toBe(false);
    });
  });

  describe("getOrderStatus", () => {
    it("returns unknown", async () => {
      const status = await woocommerceAdapter.getOrderStatus(mockConfig, "2001");
      expect(status).toBe("unknown");
    });
  });
});

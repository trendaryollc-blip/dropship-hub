import { describe, it, expect, vi, beforeEach } from "vitest";
import { shopifyAdapter } from "./shopify-adapter";
import type { StoreConfig } from "./interface";

const mockConfig: StoreConfig = {
  platform: "shopify",
  url: "https://my-store.myshopify.com",
  apiKey: "shpka_key",
  accessToken: "shpat_token",
};

describe("shopifyAdapter", () => {
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
              orders: [
                {
                  id: 1001,
                  order_number: 101,
                  email: "shopper@test.com",
                  financial_status: "paid",
                  created_at: "2026-01-15T10:00:00Z",
                  total_price: "49.99",
                  currency: "USD",
                  shipping_address: {
                    first_name: "Jane",
                    last_name: "Smith",
                    address1: "456 Oak Ave",
                    city: "Portland",
                    province: "OR",
                    zip: "97201",
                    country: "US",
                    phone: "555-9876",
                  },
                  line_items: [
                    {
                      product_id: "P001",
                      title: "Shopify Product",
                      price: "49.99",
                      quantity: 1,
                      sku: "SP-001",
                      image: { src: "https://cdn.shopify.com/img.jpg" },
                    },
                  ],
                },
              ],
            }),
        })
      );

      const orders = await shopifyAdapter.fetchOrders(mockConfig);
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe("1001");
      expect(orders[0].orderNumber).toBe("#101");
      expect(orders[0].customerName).toBe("Jane Smith");
      expect(orders[0].status).toBe("paid");
      expect(orders[0].total).toBe(49.99);
      expect(orders[0].items[0].name).toBe("Shopify Product");
    });

    it("returns empty array on non-ok response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 500 })
      );

      const orders = await shopifyAdapter.fetchOrders(mockConfig);
      expect(orders).toEqual([]);
    });

    it("passes since parameter", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ orders: [] }),
      });
      vi.stubGlobal("fetch", fetchMock);

      await shopifyAdapter.fetchOrders(mockConfig, "2026-01-01");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("created_at_min="),
        expect.anything()
      );
    });

    it("maps authorized status to paid", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              orders: [
                {
                  id: 1,
                  order_number: 1,
                  email: "a@b.com",
                  financial_status: "authorized",
                  total_price: "10",
                  currency: "USD",
                  shipping_address: { first_name: "A", last_name: "B" },
                  line_items: [],
                },
              ],
            }),
        })
      );

      const orders = await shopifyAdapter.fetchOrders(mockConfig);
      expect(orders[0].status).toBe("paid");
    });

    it("maps fulfilled status to shipped", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              orders: [
                {
                  id: 1,
                  order_number: 1,
                  email: "a@b.com",
                  financial_status: "fulfilled",
                  total_price: "10",
                  currency: "USD",
                  shipping_address: { first_name: "A", last_name: "B" },
                  line_items: [],
                },
              ],
            }),
        })
      );

      const orders = await shopifyAdapter.fetchOrders(mockConfig);
      expect(orders[0].status).toBe("shipped");
    });

    it("maps refunded status to cancelled", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              orders: [
                {
                  id: 1,
                  order_number: 1,
                  email: "a@b.com",
                  financial_status: "refunded",
                  total_price: "10",
                  currency: "USD",
                  shipping_address: { first_name: "A", last_name: "B" },
                  line_items: [],
                },
              ],
            }),
        })
      );

      const orders = await shopifyAdapter.fetchOrders(mockConfig);
      expect(orders[0].status).toBe("cancelled");
    });
  });

  describe("pushTracking", () => {
    it("returns true on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true })
      );

      const result = await shopifyAdapter.pushTracking(mockConfig, "1001", "TRACK123", "FedEx");
      expect(result).toBe(true);
    });

    it("returns false on failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false })
      );

      const result = await shopifyAdapter.pushTracking(mockConfig, "1001", "TRACK123", "FedEx");
      expect(result).toBe(false);
    });
  });

  describe("getOrderStatus", () => {
    it("returns unknown", async () => {
      const status = await shopifyAdapter.getOrderStatus(mockConfig, "1001");
      expect(status).toBe("unknown");
    });
  });
});

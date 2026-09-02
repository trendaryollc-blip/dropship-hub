import { describe, it, expect, vi, beforeEach } from "vitest";
import { trendaryoAdapter } from "./trendaryo-adapter";
import type { StoreConfig } from "./interface";

const mockConfig: StoreConfig = {
  platform: "trendaryo",
  url: "https://backend.trendaryo.com",
  apiKey: "tr_key",
};

describe("trendaryoAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.TRENDARYO_JWT_SECRET = "";
    process.env.TRENDARYO_ADMIN_UID = "";
  });

  describe("fetchOrders", () => {
    it("returns mapped orders on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                orders: [
                  {
                    id: "ord_001",
                    orderNumber: "TR-001",
                    status: "processing",
                    total: 125.5,
                    currency: "USD",
                    createdAt: { seconds: 1700000000 },
                    shippingAddress: {
                      fullName: "Alice Brown",
                      email: "alice@test.com",
                      phone: "555-2222",
                      street: "321 Elm St",
                      city: "Austin",
                      state: "TX",
                      zipCode: "73301",
                      country: "US",
                    },
                    items: [
                      {
                        productId: "TP001",
                        name: "Trendaryo Item",
                        price: 125.5,
                        quantity: 1,
                      },
                    ],
                  },
                ],
              },
            }),
        })
      );

      const orders = await trendaryoAdapter.fetchOrders(mockConfig);
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe("ord_001");
      expect(orders[0].orderNumber).toBe("TR-001");
      expect(orders[0].customerName).toBe("Alice Brown");
      expect(orders[0].status).toBe("paid");
      expect(orders[0].total).toBe(125.5);
      expect(orders[0].items[0].name).toBe("Trendaryo Item");
    });

    it("returns empty array on non-ok response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 500 })
      );

      const orders = await trendaryoAdapter.fetchOrders(mockConfig);
      expect(orders).toEqual([]);
    });

    it("maps pending status", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                orders: [
                  {
                    id: "1",
                    status: "pending",
                    total: 10,
                    shippingAddress: {},
                    items: [],
                  },
                ],
              },
            }),
        })
      );

      const orders = await trendaryoAdapter.fetchOrders(mockConfig);
      expect(orders[0].status).toBe("pending");
    });

    it("maps shipped and delivered statuses", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                orders: [
                  { id: "1", status: "shipped", total: 10, shippingAddress: {}, items: [] },
                  { id: "2", status: "delivered", total: 10, shippingAddress: {}, items: [] },
                  { id: "3", status: "cancelled", total: 10, shippingAddress: {}, items: [] },
                ],
              },
            }),
        })
      );

      const orders = await trendaryoAdapter.fetchOrders(mockConfig);
      expect(orders[0].status).toBe("shipped");
      expect(orders[1].status).toBe("delivered");
      expect(orders[2].status).toBe("cancelled");
    });
  });

  describe("pushTracking", () => {
    it("returns true on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true })
      );

      const result = await trendaryoAdapter.pushTracking(mockConfig, "ord_001", "TRK789", "DHL");
      expect(result).toBe(true);
    });

    it("returns false on failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false })
      );

      const result = await trendaryoAdapter.pushTracking(mockConfig, "ord_001", "TRK789", "DHL");
      expect(result).toBe(false);
    });
  });

  describe("getOrderStatus", () => {
    it("returns unknown", async () => {
      const status = await trendaryoAdapter.getOrderStatus(mockConfig, "ord_001");
      expect(status).toBe("unknown");
    });
  });
});

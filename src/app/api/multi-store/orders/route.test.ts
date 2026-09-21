import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/data/multi-store", () => ({
  addUnifiedOrder: vi.fn().mockResolvedValue("ord-1"),
  updateUnifiedOrder: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

function mockDb(webhookOrderDocs: { id: string; data: () => Record<string, unknown> }[]) {
  const subCollection = vi.fn().mockImplementation((name: string) => {
    if (name === "webhookOrders") {
      return {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ docs: webhookOrderDocs.map((d) => ({ id: d.id, data: d.data })) }),
      };
    }
    // unifiedOrders
    return {
      doc: vi.fn().mockReturnValue({ set: vi.fn().mockResolvedValue(undefined) }),
    };
  });
  return {
    collection: vi.fn().mockImplementation(() => ({
      doc: vi.fn().mockReturnValue({ collection: subCollection }),
    })),
  };
}

describe("/api/multi-store/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("GET returns real webhook orders mapped to the unified shape", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(mockDb([
      {
        id: "shop_1",
        data: () => ({
          orderId: "555",
          orderNumber: "#1001",
          customerName: "Jane Doe",
          customerEmail: "jane@test.com",
          totalAmount: 49.99,
          currency: "USD",
          status: "paid",
          fulfillmentStatus: "unfulfilled",
          storeId: "s1",
          storeName: "My Store",
          storePlatform: "shopify",
          items: [{ productId: "p1", title: "Widget", quantity: 1, unitPrice: 49.99, totalPrice: 49.99 }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      },
    ]));

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/multi-store/orders");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.orders).toHaveLength(1);
    expect(data.orders[0].orderNumber).toBe("#1001");
    expect(data.orders[0].storeName).toBe("My Store");
    expect(data.orders[0].totalAmount).toBe(49.99);
    expect(data.orders[0].shippingAddress).toEqual({ fullName: "", street: "", city: "", state: "", zipCode: "", country: "" });
  });

  it("POST creates order", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(mockDb([]));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/multi-store/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: "s1", orderNumber: "ORD-1", customerName: "John", items: [{ qty: 1 }] }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST returns 400 for missing fields", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(mockDb([]));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/multi-store/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: "s1" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });
});

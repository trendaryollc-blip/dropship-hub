import { describe, it, expect, vi, beforeEach } from "vitest";
import { placeCJOrder, getCJOrderStatus } from "./cj-adapter";

vi.mock("@/lib/cj-auth", () => ({
  getCJAccessToken: vi.fn().mockResolvedValue("cj-access-token"),
}));

describe("placeCJOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with order ID on successful order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: true,
            data: {
              orderNumber: "CJ-2026-001",
              estimatedDelivery: "2026-02-15",
            },
          }),
      })
    );

    const result = await placeCJOrder({
      productId: "PROD001",
      quantity: 5,
      shippingAddress: {
        fullName: "Test User",
        phone: "555-0000",
        street: "123 Test St",
        city: "Testville",
        state: "TS",
        zipCode: "12345",
        country: "US",
      },
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBe("CJ-2026-001");
    expect(result.estimatedDelivery).toBe("2026-02-15");
  });

  it("returns failure when CJ returns non-success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            result: false,
            message: "Product not found",
          }),
      })
    );

    const result = await placeCJOrder({
      productId: "BAD001",
      quantity: 1,
      shippingAddress: {
        fullName: "Test",
        phone: "555",
        street: "123",
        city: "City",
        state: "ST",
        zipCode: "00000",
        country: "US",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Product not found");
  });

  it("returns failure on network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network timeout"))
    );

    const result = await placeCJOrder({
      productId: "PROD001",
      quantity: 1,
      shippingAddress: {
        fullName: "Test",
        phone: "555",
        street: "123",
        city: "City",
        state: "ST",
        zipCode: "00000",
        country: "US",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network timeout");
  });
});

describe("getCJOrderStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns order status and tracking info", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              status: "shipped",
              trackingNumber: "CJTRACK123",
              logisticsName: "CJ Standard",
            },
          }),
      })
    );

    const result = await getCJOrderStatus("CJ-2026-001");
    expect(result.status).toBe("shipped");
    expect(result.trackingNumber).toBe("CJTRACK123");
    expect(result.carrier).toBe("CJ Standard");
  });

  it("returns unknown on error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("fail"))
    );

    const result = await getCJOrderStatus("CJ-000");
    expect(result.status).toBe("unknown");
    expect(result.trackingNumber).toBeNull();
    expect(result.carrier).toBeNull();
  });

  it("returns unknown when data is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      })
    );

    const result = await getCJOrderStatus("CJ-000");
    expect(result.status).toBe("unknown");
  });
});

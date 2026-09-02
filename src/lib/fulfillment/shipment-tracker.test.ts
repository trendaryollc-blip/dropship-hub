import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getShipmentStatus,
  shouldUpdateTracking,
  getTrackingStatusColor,
  getTrackingStatusText,
} from "./shipment-tracker";
import type { ShipmentStatus } from "./shipment-tracker";

vi.mock("@/lib/cj-auth", () => ({
  getCJAccessToken: vi.fn().mockResolvedValue("cj-access-token"),
}));

describe("Shipment Tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getShipmentStatus", () => {
    it("returns shipment status for valid order", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              result: true,
              data: {
                orderNumber: "CJ-2026-001",
                status: "shipped",
                trackingNumber: "TRACK123",
                logisticsName: "DHL",
                estimatedDelivery: "2026-02-15",
                trackingHistory: [
                  {
                    time: "2026-01-20",
                    status: "Shipped",
                    location: "Shenzhen, China",
                    description: "Package picked up",
                    logisticsName: "DHL",
                  },
                ],
              },
            }),
        })
      );

      const status = await getShipmentStatus("CJ-2026-001");
      expect(status.status).toBe("shipped");
      expect(status.trackingNumber).toBe("TRACK123");
      expect(status.carrier).toBe("DHL");
      expect(status.events.length).toBe(1);
    });

    it("returns default status on error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("API Error"))
      );

      const status = await getShipmentStatus("CJ-000");
      expect(status.status).toBe("pending");
      expect(status.trackingNumber).toBeNull();
    });

    it("maps status correctly", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              result: true,
              data: {
                status: "in_transit",
                trackingNumber: "TRACK456",
                logisticsName: "FedEx",
              },
            }),
        })
      );

      const status = await getShipmentStatus("CJ-002");
      expect(status.status).toBe("in_transit");
    });
  });

  describe("shouldUpdateTracking", () => {
    it("returns true when tracking number changed", () => {
      const status: ShipmentStatus = {
        orderId: "",
        cjOrderNumber: "",
        status: "shipped",
        trackingNumber: "NEW_TRACK",
        carrier: "DHL",
        estimatedDelivery: null,
        actualDelivery: null,
        events: [],
        lastUpdated: "",
      };

      expect(shouldUpdateTracking(status, "OLD_TRACK")).toBe(true);
    });

    it("returns false when tracking is same", () => {
      const status: ShipmentStatus = {
        orderId: "",
        cjOrderNumber: "",
        status: "shipped",
        trackingNumber: "TRACK123",
        carrier: "DHL",
        estimatedDelivery: null,
        actualDelivery: null,
        events: [],
        lastUpdated: "",
      };

      expect(shouldUpdateTracking(status, "TRACK123")).toBe(false);
    });

    it("returns true for exception status", () => {
      const status: ShipmentStatus = {
        orderId: "",
        cjOrderNumber: "",
        status: "exception",
        trackingNumber: "TRACK123",
        carrier: "DHL",
        estimatedDelivery: null,
        actualDelivery: null,
        events: [],
        lastUpdated: "",
      };

      expect(shouldUpdateTracking(status, "TRACK123")).toBe(true);
    });

    it("returns false when no tracking number", () => {
      const status: ShipmentStatus = {
        orderId: "",
        cjOrderNumber: "",
        status: "pending",
        trackingNumber: null,
        carrier: null,
        estimatedDelivery: null,
        actualDelivery: null,
        events: [],
        lastUpdated: "",
      };

      expect(shouldUpdateTracking(status, null)).toBe(false);
    });
  });

  describe("getTrackingStatusColor", () => {
    it("returns correct colors for each status", () => {
      expect(getTrackingStatusColor("pending")).toBe("#6b7280");
      expect(getTrackingStatusColor("processing")).toBe("#3b82f6");
      expect(getTrackingStatusColor("shipped")).toBe("#8b5cf6");
      expect(getTrackingStatusColor("in_transit")).toBe("#f59e0b");
      expect(getTrackingStatusColor("out_for_delivery")).toBe("#10b981");
      expect(getTrackingStatusColor("delivered")).toBe("#22c55e");
      expect(getTrackingStatusColor("exception")).toBe("#ef4444");
      expect(getTrackingStatusColor("returned")).toBe("#6b7280");
    });
  });

  describe("getTrackingStatusText", () => {
    it("returns correct text for each status", () => {
      expect(getTrackingStatusText("pending")).toBe("Pending");
      expect(getTrackingStatusText("processing")).toBe("Processing");
      expect(getTrackingStatusText("shipped")).toBe("Shipped");
      expect(getTrackingStatusText("in_transit")).toBe("In Transit");
      expect(getTrackingStatusText("out_for_delivery")).toBe("Out for Delivery");
      expect(getTrackingStatusText("delivered")).toBe("Delivered");
      expect(getTrackingStatusText("exception")).toBe("Exception");
      expect(getTrackingStatusText("returned")).toBe("Returned");
    });
  });
});

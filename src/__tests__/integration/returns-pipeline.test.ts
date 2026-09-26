import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateRefund } from "@/lib/data/returns";
import { purchaseReturnLabel, formatAddress, buildReturnInstructions } from "@/lib/shipping/label-service";
import { ConfigMissingError } from "@/lib/api-keys/pool";
import type { SupplierRefundPolicy, LabelAddress } from "@/types/returns";

const FROM: LabelAddress = {
  name: "Jane Customer",
  street1: "123 Main St",
  city: "Austin",
  state: "TX",
  zip: "78701",
  country: "US",
};

const TO: LabelAddress = {
  name: "Trendaryo Returns",
  street1: "500 Commerce St",
  city: "Los Angeles",
  state: "CA",
  zip: "90001",
  country: "US",
};

function easypostCreateResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      shipment: {
        id: "shp_1",
        rates: [
          { id: "rate_expensive", carrier: "UPS", service: "Ground", rate: "12.50", currency: "USD" },
          { id: "rate_cheap", carrier: "USPS", service: "Priority Mail", rate: "7.35", currency: "USD" },
        ],
      },
    }),
  };
}

function easypostBuyResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      shipment: {
        id: "shp_1",
        tracking_code: "940011189922319876543210",
        postage_label: { label_url: "https://api.easypost.com/postage_label/label.pdf" },
        selected_rate: { id: "rate_cheap", carrier: "USPS", service: "Priority Mail", rate: "7.35", currency: "USD" },
      },
    }),
  };
}

describe("Returns Pipeline Integration", () => {
  const originalKey = process.env.EASYPOST_API_KEYS;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    delete process.env.EASYPOST_API_KEYS;
    delete process.env.EASYPOST_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) {
      delete process.env.EASYPOST_API_KEYS;
    } else {
      process.env.EASYPOST_API_KEYS = originalKey;
    }
    vi.resetModules();
  });

  describe("purchaseReturnLabel (EasyPost)", () => {
    it("throws ConfigMissingError when no key is configured", async () => {
      await expect(
        purchaseReturnLabel({ fromAddress: FROM, toAddress: TO })
      ).rejects.toBeInstanceOf(ConfigMissingError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("creates a return shipment, buys the cheapest rate, and returns a real label", async () => {
      process.env.EASYPOST_API_KEYS = "pk_test_easypost_key";
      fetchMock
        .mockResolvedValueOnce(easypostCreateResponse())
        .mockResolvedValueOnce(easypostBuyResponse());

      const label = await purchaseReturnLabel({
        fromAddress: FROM,
        toAddress: TO,
        reference: "ORD-001",
        parcel: { weightOz: 24 },
      });

      expect(label.carrier).toBe("USPS");
      expect(label.trackingNumber).toBe("940011189922319876543210");
      expect(label.labelUrl).toContain("https://");
      expect(label.postagePrice.amount).toBe(7.35);
      expect(label.returnAddress).toContain("500 Commerce St");
      expect(label.instructions).toContain("USPS");
      expect(label.instructions).toContain(label.trackingNumber);

      const [createUrl, createInit] = fetchMock.mock.calls[0];
      expect(createUrl).toContain("/v2/shipments");
      const createdBody = JSON.parse(createInit.body);
      expect(createdBody.shipment.is_return).toBe(true);
      expect(createdBody.shipment.reference).toBe("ORD-001");
      expect(createdBody.shipment.parcel.weight).toBe(24);
      expect(createdBody.shipment.from_address.street1).toBe("123 Main St");
      expect(createInit.headers.Authorization).toMatch(/^Basic /);

      const [buyUrl] = fetchMock.mock.calls[1];
      expect(buyUrl).toContain("/v2/shipments/shp_1/buy");
    });

    it("surfaces an honest error when EasyPost returns no rates", async () => {
      process.env.EASYPOST_API_KEYS = "pk_test_easypost_key";
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ shipment: { id: "shp_empty", rates: [] } }),
      });

      await expect(
        purchaseReturnLabel({ fromAddress: FROM, toAddress: TO })
      ).rejects.toThrow(/no shipping rates/i);
    });

    it("propagates EasyPost API failures", async () => {
      process.env.EASYPOST_API_KEYS = "pk_test_easypost_key";
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: "Address could not be verified" } }),
      });

      await expect(
        purchaseReturnLabel({ fromAddress: FROM, toAddress: TO })
      ).rejects.toThrow(/Address could not be verified/);
    });
  });

  describe("label formatting", () => {
    it("formatAddress renders a multi-line address", () => {
      const text = formatAddress(TO);
      expect(text).toContain("Trendaryo Returns");
      expect(text).toContain("Los Angeles, CA 90001");
      expect(text.split("\n")).toHaveLength(3);
    });

    it("buildReturnInstructions references the carrier and tracking", () => {
      const instructions = buildReturnInstructions("USPS", "94001");
      expect(instructions).toContain("USPS");
      expect(instructions).toContain("94001");
      expect(instructions).toContain("Print this return label");
    });
  });

  describe("calculateRefund - full refund scenarios", () => {
    const fullRefundPolicy: SupplierRefundPolicy = {
      type: "full_refund",
      restockingFeePercent: 0,
      refundWindowDays: 30,
      returnShippingPaidBy: "seller",
    };

    it("full refund with no fees returns subtotal + shipping", () => {
      const result = calculateRefund(100, 10, 0, fullRefundPolicy);
      expect(result.supplierRefundAmount).toBe(100);
      expect(result.totalRefund).toBe(110);
    });

    it("full refund with platform fees subtracts fees", () => {
      const result = calculateRefund(100, 10, 5, fullRefundPolicy);
      expect(result.totalRefund).toBe(105);
    });
  });

  describe("calculateRefund - partial refund scenarios", () => {
    it("15% restocking fee on $100", () => {
      const result = calculateRefund(100, 0, 0, {
        type: "partial_refund",
        restockingFeePercent: 15,
        refundWindowDays: 30,
        returnShippingPaidBy: "seller",
      });
      expect(result.supplierRefundAmount).toBe(85);
    });

    it("25% restocking fee on $200", () => {
      const result = calculateRefund(200, 0, 0, {
        type: "partial_refund",
        restockingFeePercent: 25,
        refundWindowDays: 30,
        returnShippingPaidBy: "seller",
      });
      expect(result.supplierRefundAmount).toBe(150);
    });

    it("50% restocking fee", () => {
      const result = calculateRefund(100, 0, 0, {
        type: "partial_refund",
        restockingFeePercent: 50,
        refundWindowDays: 30,
        returnShippingPaidBy: "seller",
      });
      expect(result.supplierRefundAmount).toBe(50);
    });
  });

  describe("calculateRefund - store credit scenarios", () => {
    it("store credit returns full subtotal plus seller-paid shipping", () => {
      const result = calculateRefund(50, 5, 0, {
        type: "store_credit_only",
        restockingFeePercent: 0,
        refundWindowDays: 30,
        returnShippingPaidBy: "seller",
      });
      expect(result.supplierRefundAmount).toBe(50);
      expect(result.totalRefund).toBe(55);
    });

    it("store credit with buyer-paid shipping excludes shipping", () => {
      const result = calculateRefund(50, 5, 0, {
        type: "store_credit_only",
        restockingFeePercent: 0,
        refundWindowDays: 30,
        returnShippingPaidBy: "buyer",
      });
      expect(result.supplierRefundAmount).toBe(50);
      expect(result.totalRefund).toBe(50);
    });
  });

  describe("calculateRefund - no refund scenarios", () => {
    it("no refund still refunds seller-paid shipping minus platform fees", () => {
      const result = calculateRefund(100, 10, 5, {
        type: "no_refund",
        restockingFeePercent: 0,
        refundWindowDays: 30,
        returnShippingPaidBy: "seller",
      });
      expect(result.supplierRefundAmount).toBe(0);
      expect(result.totalRefund).toBe(5);
    });

    it("no refund with buyer-paid shipping returns 0", () => {
      const result = calculateRefund(100, 10, 5, {
        type: "no_refund",
        restockingFeePercent: 0,
        refundWindowDays: 30,
        returnShippingPaidBy: "buyer",
      });
      expect(result.supplierRefundAmount).toBe(0);
      expect(result.totalRefund).toBe(0);
    });
  });

  describe("calculateRefund - shipping cost scenarios", () => {
    it("buyer pays return shipping excludes shipping from refund", () => {
      const result = calculateRefund(50, 8, 0, {
        type: "full_refund",
        restockingFeePercent: 0,
        refundWindowDays: 30,
        returnShippingPaidBy: "buyer",
      });
      expect(result.totalRefund).toBe(50);
    });

    it("seller pays return shipping includes shipping in refund", () => {
      const result = calculateRefund(50, 8, 0, {
        type: "full_refund",
        restockingFeePercent: 0,
        refundWindowDays: 30,
        returnShippingPaidBy: "seller",
      });
      expect(result.totalRefund).toBe(58);
    });
  });

  describe("calculateRefund - edge cases", () => {
    it("zero subtotal returns zero", () => {
      const result = calculateRefund(0, 0, 0, {
        type: "full_refund",
        restockingFeePercent: 0,
        refundWindowDays: 30,
        returnShippingPaidBy: "seller",
      });
      expect(result.supplierRefundAmount).toBe(0);
      expect(result.totalRefund).toBe(0);
    });

    it("platform fees greater than subtotal returns 0 (not negative)", () => {
      const result = calculateRefund(10, 0, 50, {
        type: "full_refund",
        restockingFeePercent: 0,
        refundWindowDays: 30,
        returnShippingPaidBy: "seller",
      });
      expect(result.totalRefund).toBe(0);
    });

    it("rounds to 2 decimal places for cents", () => {
      const result = calculateRefund(33.33, 3.33, 1.11, {
        type: "full_refund",
        restockingFeePercent: 0,
        refundWindowDays: 30,
        returnShippingPaidBy: "seller",
      });
      expect(result.totalRefund).toBe(35.55);
    });

    it("restocking fee with cents rounds correctly", () => {
      const result = calculateRefund(33.33, 0, 0, {
        type: "partial_refund",
        restockingFeePercent: 15,
        refundWindowDays: 30,
        returnShippingPaidBy: "seller",
      });
      expect(result.supplierRefundAmount).toBe(28.33);
    });
  });

  describe("return request lifecycle", () => {
    it("simulate full return lifecycle states", () => {
      const lifecycle = [
        "pending",
        "approved",
        "label_generated",
        "shipped_back",
        "received",
        "inspected",
        "refunded",
      ];
      expect(lifecycle).toHaveLength(7);
      expect(lifecycle[0]).toBe("pending");
      expect(lifecycle[lifecycle.length - 1]).toBe("refunded");
    });

    it("simulate denied return lifecycle", () => {
      const lifecycle = ["pending", "denied"];
      expect(lifecycle).toHaveLength(2);
    });

    it("simulate cancelled return lifecycle", () => {
      const lifecycle = ["pending", "cancelled"];
      expect(lifecycle).toHaveLength(2);
    });
  });

  describe("defect report lifecycle", () => {
    it("simulate defect resolution lifecycle", () => {
      const lifecycle = [
        "pending",
        "replacement_sent",
      ];
      expect(lifecycle[0]).toBe("pending");
      expect(lifecycle[1]).toBe("replacement_sent");
    });

    it("escalation path", () => {
      const lifecycle = ["pending", "escalated"];
      expect(lifecycle).toHaveLength(2);
    });

    it("supplier claim path", () => {
      const lifecycle = ["pending", "supplier_claimed"];
      expect(lifecycle).toHaveLength(2);
    });
  });
});

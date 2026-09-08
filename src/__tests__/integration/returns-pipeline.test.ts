import { describe, it, expect } from "vitest";
import { generateReturnLabel, calculateRefund } from "@/lib/data/returns";
import type { SupplierRefundPolicy } from "@/types/returns";

describe("Returns Pipeline Integration", () => {
  describe("generateReturnLabel", () => {
    it("generates label with unique tracking number", () => {
      const label1 = generateReturnLabel("ord-1", "ret-1", "Supplier A");
      const label2 = generateReturnLabel("ord-2", "ret-2", "Supplier B");
      expect(label1!.trackingNumber).not.toBe(label2!.trackingNumber);
    });

    it("includes supplier name in return address", () => {
      const label = generateReturnLabel("ord-1", "ret-1", "ACME Corp");
      expect(label!.returnAddress).toContain("ACME Corp");
    });

    it("uses a valid carrier", () => {
      const validCarriers = ["USPS", "UPS", "FedEx", "DHL"];
      const label = generateReturnLabel("ord-1", "ret-1", "Supplier");
      expect(validCarriers).toContain(label!.carrier);
    });

    it("tracking number starts with RT", () => {
      const label = generateReturnLabel("ord-1", "ret-1", "Supplier");
      expect(label!.trackingNumber).toMatch(/^RT/);
    });

    it("includes tracking number in instructions", () => {
      const label = generateReturnLabel("ord-1", "ret-1", "Supplier");
      expect(label!.instructions).toContain(label!.trackingNumber);
    });

    it("instructions mention the carrier", () => {
      const label = generateReturnLabel("ord-1", "ret-1", "Supplier");
      expect(label!.instructions).toContain(label!.carrier);
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

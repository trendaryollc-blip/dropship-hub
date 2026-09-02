import { describe, it, expect } from "vitest";
import {
  calculateRealTimeProfit,
  calculateProfitMargin,
  generateProfitSummary,
  generateProfitAlerts,
  calculateProfitByProduct,
  calculateProfitByPlatform,
} from "./realtime-profit";
import type { OrderProfitData } from "./realtime-profit";

describe("Real-Time Profit", () => {
  describe("calculateRealTimeProfit", () => {
    it("calculates profit correctly", () => {
      const profit = calculateRealTimeProfit({
        revenue: 100,
        quantity: 1,
        cogs: 30,
        shippingCost: 10,
        platformFeePercent: 15,
        paymentProcessingPercent: 3,
      });

      const expectedPlatformFee = 100 * 0.15;
      const expectedPaymentProcessing = 100 * 0.03;
      const expectedTotalCosts = 30 + 10 + expectedPlatformFee + expectedPaymentProcessing;
      const expectedProfit = 100 - expectedTotalCosts;

      expect(profit).toBe(+expectedProfit.toFixed(2));
    });

    it("handles zero revenue", () => {
      const profit = calculateRealTimeProfit({
        revenue: 0,
        quantity: 1,
        cogs: 30,
        shippingCost: 10,
        platformFeePercent: 15,
        paymentProcessingPercent: 3,
      });

      expect(profit).toBe(0);
    });

    it("includes tax in calculation", () => {
      const profit = calculateRealTimeProfit({
        revenue: 100,
        quantity: 1,
        cogs: 30,
        shippingCost: 10,
        platformFeePercent: 15,
        paymentProcessingPercent: 3,
        taxRate: 8,
      });

      const expectedTax = 100 * 0.08;
      const expectedPlatformFee = 100 * 0.15;
      const expectedPaymentProcessing = 100 * 0.03;
      const expectedTotalCosts = 30 + 10 + expectedPlatformFee + expectedPaymentProcessing + expectedTax;
      const expectedProfit = 100 - expectedTotalCosts;

      expect(profit).toBe(+expectedProfit.toFixed(2));
    });
  });

  describe("calculateProfitMargin", () => {
    it("calculates margin correctly", () => {
      const margin = calculateProfitMargin(100, 25);
      expect(margin).toBe(25);
    });

    it("handles zero revenue", () => {
      const margin = calculateProfitMargin(0, 25);
      expect(margin).toBe(0);
    });

    it("handles negative profit", () => {
      const margin = calculateProfitMargin(100, -10);
      expect(margin).toBe(-10);
    });
  });

  describe("generateProfitSummary", () => {
    const sampleOrders: OrderProfitData[] = [
      {
        orderId: "O1",
        orderDate: new Date().toISOString().split("T")[0],
        productTitle: "Product 1",
        platform: "Shopify",
        supplier: "CJ",
        revenue: 100,
        quantity: 1,
        cogs: 30,
        shippingCost: 10,
        platformFee: 15,
        paymentProcessing: 3,
        refunds: 0,
        adSpend: 5,
        otherCosts: 2,
        taxAmount: 8,
        netProfit: 27,
        profitMargin: 27,
        status: "completed",
      },
      {
        orderId: "O2",
        orderDate: new Date().toISOString().split("T")[0],
        productTitle: "Product 2",
        platform: "eBay",
        supplier: "CJ",
        revenue: 200,
        quantity: 2,
        cogs: 60,
        shippingCost: 20,
        platformFee: 30,
        paymentProcessing: 6,
        refunds: 10,
        adSpend: 10,
        otherCosts: 4,
        taxAmount: 16,
        netProfit: 44,
        profitMargin: 22,
        status: "completed",
      },
    ];

    it("generates correct summary", () => {
      const summary = generateProfitSummary(sampleOrders);
      expect(summary.totalRevenue).toBe(300);
      expect(summary.totalOrders).toBe(2);
      expect(summary.todayOrders).toBe(2);
    });

    it("returns zero values for empty orders", () => {
      const summary = generateProfitSummary([]);
      expect(summary.totalRevenue).toBe(0);
      expect(summary.totalOrders).toBe(0);
    });
  });

  describe("generateProfitAlerts", () => {
    it("generates low margin alert", () => {
      const orders: OrderProfitData[] = [
        {
          orderId: "O1",
          orderDate: new Date().toISOString().split("T")[0],
          productTitle: "Product 1",
          platform: "Shopify",
          supplier: "CJ",
          revenue: 100,
          quantity: 1,
          cogs: 80,
          shippingCost: 10,
          platformFee: 5,
          paymentProcessing: 2,
          refunds: 0,
          adSpend: 0,
          otherCosts: 0,
          taxAmount: 0,
          netProfit: 3,
          profitMargin: 3,
          status: "completed",
        },
      ];

      const alerts = generateProfitAlerts(orders, { lowMarginThreshold: 10 });
      expect(alerts.some((a) => a.type === "low_margin")).toBe(true);
    });

    it("generates loss warning", () => {
      const orders: OrderProfitData[] = [
        {
          orderId: "O1",
          orderDate: new Date().toISOString().split("T")[0],
          productTitle: "Product 1",
          platform: "Shopify",
          supplier: "CJ",
          revenue: 100,
          quantity: 1,
          cogs: 90,
          shippingCost: 10,
          platformFee: 5,
          paymentProcessing: 2,
          refunds: 0,
          adSpend: 0,
          otherCosts: 0,
          taxAmount: 0,
          netProfit: -7,
          profitMargin: -7,
          status: "completed",
        },
      ];

      const alerts = generateProfitAlerts(orders);
      expect(alerts.some((a) => a.type === "loss_warning")).toBe(true);
    });
  });

  describe("calculateProfitByProduct", () => {
    it("groups profit by product", () => {
      const orders: OrderProfitData[] = [
        {
          orderId: "O1",
          orderDate: "",
          productTitle: "Product A",
          platform: "",
          supplier: "",
          revenue: 100,
          quantity: 1,
          cogs: 30,
          shippingCost: 10,
          platformFee: 15,
          paymentProcessing: 3,
          refunds: 0,
          adSpend: 0,
          otherCosts: 0,
          taxAmount: 0,
          netProfit: 42,
          profitMargin: 42,
          status: "completed",
        },
        {
          orderId: "O2",
          orderDate: "",
          productTitle: "Product A",
          platform: "",
          supplier: "",
          revenue: 150,
          quantity: 1,
          cogs: 45,
          shippingCost: 15,
          platformFee: 22.5,
          paymentProcessing: 4.5,
          refunds: 0,
          adSpend: 0,
          otherCosts: 0,
          taxAmount: 0,
          netProfit: 63,
          profitMargin: 42,
          status: "completed",
        },
      ];

      const byProduct = calculateProfitByProduct(orders);
      expect(byProduct.length).toBe(1);
      expect(byProduct[0].productTitle).toBe("Product A");
      expect(byProduct[0].totalOrders).toBe(2);
      expect(byProduct[0].totalRevenue).toBe(250);
    });
  });

  describe("calculateProfitByPlatform", () => {
    it("groups profit by platform", () => {
      const orders: OrderProfitData[] = [
        {
          orderId: "O1",
          orderDate: "",
          productTitle: "Product 1",
          platform: "Shopify",
          supplier: "",
          revenue: 100,
          quantity: 1,
          cogs: 30,
          shippingCost: 10,
          platformFee: 15,
          paymentProcessing: 3,
          refunds: 0,
          adSpend: 0,
          otherCosts: 0,
          taxAmount: 0,
          netProfit: 42,
          profitMargin: 42,
          status: "completed",
        },
        {
          orderId: "O2",
          orderDate: "",
          productTitle: "Product 2",
          platform: "eBay",
          supplier: "",
          revenue: 200,
          quantity: 1,
          cogs: 60,
          shippingCost: 20,
          platformFee: 30,
          paymentProcessing: 6,
          refunds: 0,
          adSpend: 0,
          otherCosts: 0,
          taxAmount: 0,
          netProfit: 84,
          profitMargin: 42,
          status: "completed",
        },
      ];

      const byPlatform = calculateProfitByPlatform(orders);
      expect(byPlatform.length).toBe(2);
      expect(byPlatform[0].platform).toBe("eBay");
      expect(byPlatform[1].platform).toBe("Shopify");
    });
  });
});

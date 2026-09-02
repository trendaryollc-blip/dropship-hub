import { describe, it, expect, beforeEach } from "vitest";
import {
  generatePnLReport,
  getReport,
  getAllReports,
  deleteReport,
  exportReportToCSV,
  exportReportToPDFData,
  validatePnLReportInput,
} from "./pnl-report";

describe("P&L Report", () => {
  beforeEach(() => {
    const reports = getAllReports();
    for (const report of reports) {
      deleteReport(report.id);
    }
  });

  describe("generatePnLReport", () => {
    it("generates a complete P&L report", () => {
      const report = generatePnLReport(
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          includeBreakdown: true,
        },
        {
          orders: [
            {
              orderId: "O1",
              orderDate: "2024-01-15",
              revenue: 100,
              cogs: 30,
              shippingCost: 10,
              platformFee: 15,
              paymentProcessing: 3,
              refunds: 0,
              adSpend: 5,
              otherCosts: 2,
              productTitle: "Product 1",
              productId: "P1",
              platform: "Shopify",
              supplierId: "cj",
              supplierName: "CJ Dropshipping",
              status: "completed",
            },
            {
              orderId: "O2",
              orderDate: "2024-01-20",
              revenue: 200,
              cogs: 60,
              shippingCost: 20,
              platformFee: 30,
              paymentProcessing: 6,
              refunds: 10,
              adSpend: 10,
              otherCosts: 4,
              productTitle: "Product 2",
              productId: "P2",
              platform: "eBay",
              supplierId: "cj",
              supplierName: "CJ Dropshipping",
              status: "completed",
            },
          ],
        }
      );

      expect(report.id).toBeDefined();
      expect(report.period.label).toContain("Jan");
      expect(report.revenue.totalSales).toBe(300);
      expect(report.revenue.refunds).toBe(10);
      expect(report.revenue.netRevenue).toBe(290);
      expect(report.costs.totalCosts).toBeGreaterThan(0);
      expect(report.profit.netProfit).toBeDefined();
      expect(report.metrics.totalOrders).toBe(2);
      expect(report.breakdown.byProduct.length).toBe(2);
      expect(report.breakdown.byPlatform.length).toBe(2);
    });

    it("filters out refunded orders", () => {
      const report = generatePnLReport(
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        {
          orders: [
            {
              orderId: "O1",
              orderDate: "2024-01-15",
              revenue: 100,
              cogs: 30,
              shippingCost: 10,
              platformFee: 15,
              paymentProcessing: 3,
              refunds: 0,
              adSpend: 5,
              otherCosts: 2,
              productTitle: "Product 1",
              productId: "P1",
              platform: "Shopify",
              supplierId: "cj",
              supplierName: "CJ Dropshipping",
              status: "refunded",
            },
          ],
        }
      );

      expect(report.metrics.totalOrders).toBe(0);
    });
  });

  describe("exportReportToCSV", () => {
    it("exports report to CSV format", () => {
      const report = generatePnLReport(
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        {
          orders: [
            {
              orderId: "O1",
              orderDate: "2024-01-15",
              revenue: 100,
              cogs: 30,
              shippingCost: 10,
              platformFee: 15,
              paymentProcessing: 3,
              refunds: 0,
              adSpend: 5,
              otherCosts: 2,
              productTitle: "Product 1",
              productId: "P1",
              platform: "Shopify",
              supplierId: "cj",
              supplierName: "CJ Dropshipping",
              status: "completed",
            },
          ],
        }
      );

      const csv = exportReportToCSV(report);
      expect(csv).toContain("P&L Report");
      expect(csv).toContain("Revenue");
      expect(csv).toContain("Costs");
      expect(csv).toContain("Profit");
      expect(csv).toContain("Metrics");
    });
  });

  describe("exportReportToPDFData", () => {
    it("exports report to PDF data format", () => {
      const report = generatePnLReport(
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        {
          orders: [
            {
              orderId: "O1",
              orderDate: "2024-01-15",
              revenue: 100,
              cogs: 30,
              shippingCost: 10,
              platformFee: 15,
              paymentProcessing: 3,
              refunds: 0,
              adSpend: 5,
              otherCosts: 2,
              productTitle: "Product 1",
              productId: "P1",
              platform: "Shopify",
              supplierId: "cj",
              supplierName: "CJ Dropshipping",
              status: "completed",
            },
          ],
        }
      );

      const pdfData = exportReportToPDFData(report);
      expect(pdfData.title).toBe("Profit & Loss Report");
      expect(pdfData.sections.length).toBe(4);
      expect(pdfData.sections[0].title).toBe("Revenue");
      expect(pdfData.sections[1].title).toBe("Costs");
      expect(pdfData.sections[2].title).toBe("Profit");
      expect(pdfData.sections[3].title).toBe("Key Metrics");
    });
  });

  describe("validatePnLReportInput", () => {
    it("validates correct input", () => {
      const result = validatePnLReportInput({
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("rejects missing start date", () => {
      const result = validatePnLReportInput({
        startDate: "",
        endDate: "2024-01-31",
      });

      expect(result.valid).toBe(false);
    });

    it("rejects missing end date", () => {
      const result = validatePnLReportInput({
        startDate: "2024-01-01",
        endDate: "",
      });

      expect(result.valid).toBe(false);
    });

    it("rejects start date after end date", () => {
      const result = validatePnLReportInput({
        startDate: "2024-01-31",
        endDate: "2024-01-01",
      });

      expect(result.valid).toBe(false);
    });

    it("rejects invalid format", () => {
      const result = validatePnLReportInput({
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        format: "invalid" as "pdf",
      });

      expect(result.valid).toBe(false);
    });
  });

  describe("getReport", () => {
    it("retrieves a report by ID", () => {
      const report = generatePnLReport(
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        { orders: [] }
      );

      const retrieved = getReport(report.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(report.id);
    });

    it("returns null for non-existent report", () => {
      const retrieved = getReport("non-existent");
      expect(retrieved).toBeNull();
    });
  });
});

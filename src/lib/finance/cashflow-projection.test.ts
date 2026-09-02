import { describe, it, expect, beforeEach } from "vitest";
import {
  addCashFlowEntry,
  getCashFlowEntry,
  getAllCashFlowEntries,
  getCashFlowEntriesByDateRange,
  updateCashFlowEntry,
  deleteCashFlowEntry,
  generateCashFlowProjection,
  calculatePaymentTermsDueDate,
  getCashFlowSummary,
  getUpcomingPayments,
  validateCashFlowInput,
} from "./cashflow-projection";

describe("Cash Flow Projection", () => {
  beforeEach(() => {
    const entries = getAllCashFlowEntries();
    for (const entry of entries) {
      deleteCashFlowEntry(entry.id);
    }
  });

  describe("addCashFlowEntry", () => {
    it("adds a new cash flow entry", () => {
      const entry = addCashFlowEntry({
        type: "inflow",
        category: "sales",
        description: "Product sale",
        amount: 100,
        date: "2024-01-15",
        status: "completed",
      });

      expect(entry.id).toBeDefined();
      expect(entry.amount).toBe(100);
      expect(entry.type).toBe("inflow");
    });
  });

  describe("getCashFlowEntry", () => {
    it("retrieves an entry by ID", () => {
      const created = addCashFlowEntry({
        type: "inflow",
        category: "sales",
        description: "Product sale",
        amount: 100,
        date: "2024-01-15",
        status: "completed",
      });

      const retrieved = getCashFlowEntry(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.amount).toBe(100);
    });

    it("returns null for non-existent entry", () => {
      const retrieved = getCashFlowEntry("non-existent");
      expect(retrieved).toBeNull();
    });
  });

  describe("updateCashFlowEntry", () => {
    it("updates an entry", () => {
      const created = addCashFlowEntry({
        type: "inflow",
        category: "sales",
        description: "Product sale",
        amount: 100,
        date: "2024-01-15",
        status: "completed",
      });

      const updated = updateCashFlowEntry(created.id, { amount: 150 });
      expect(updated).not.toBeNull();
      expect(updated!.amount).toBe(150);
    });

    it("returns null for non-existent entry", () => {
      const updated = updateCashFlowEntry("non-existent", { amount: 150 });
      expect(updated).toBeNull();
    });
  });

  describe("deleteCashFlowEntry", () => {
    it("deletes an entry", () => {
      const created = addCashFlowEntry({
        type: "inflow",
        category: "sales",
        description: "Product sale",
        amount: 100,
        date: "2024-01-15",
        status: "completed",
      });

      const deleted = deleteCashFlowEntry(created.id);
      expect(deleted).toBe(true);
      expect(getCashFlowEntry(created.id)).toBeNull();
    });

    it("returns false for non-existent entry", () => {
      const deleted = deleteCashFlowEntry("non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("generateCashFlowProjection", () => {
    it("generates a projection", () => {
      addCashFlowEntry({
        type: "inflow",
        category: "sales",
        description: "Product sale",
        amount: 100,
        date: "2024-01-15",
        status: "completed",
      });

      addCashFlowEntry({
        type: "outflow",
        category: "cogs",
        description: "Product cost",
        amount: 50,
        date: "2024-01-15",
        status: "completed",
      });

      const projection = generateCashFlowProjection({
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        startingBalance: 1000,
        entries: getAllCashFlowEntries(),
      });

      expect(projection.id).toBeDefined();
      expect(projection.summary.totalInflows).toBe(100);
      expect(projection.summary.totalOutflows).toBe(50);
      expect(projection.summary.netCashFlow).toBe(50);
      expect(projection.dailyProjections.length).toBe(31);
    });

    it("generates alerts for negative balance", () => {
      const entries = [];
      for (let i = 1; i <= 10; i++) {
        entries.push({
          type: "outflow" as const,
          category: "cogs" as const,
          description: "Large purchase",
          amount: 200,
          date: `2024-01-${i.toString().padStart(2, "0")}`,
          status: "completed" as const,
        });
      }

      const projection = generateCashFlowProjection({
        startDate: "2024-01-01",
        endDate: "2024-01-10",
        startingBalance: 100,
        entries,
      });

      expect(projection.alerts.some((a) => a.type === "cash_shortage")).toBe(true);
    });
  });

  describe("calculatePaymentTermsDueDate", () => {
    it("calculates due date for net_30", () => {
      const dueDate = calculatePaymentTermsDueDate("2024-01-01", {
        type: "net_30",
        days: 30,
        dueDate: "",
      });

      expect(dueDate).toBe("2024-01-31");
    });

    it("calculates due date for net_15", () => {
      const dueDate = calculatePaymentTermsDueDate("2024-01-15", {
        type: "net_15",
        days: 15,
        dueDate: "",
      });

      expect(dueDate).toBe("2024-01-30");
    });
  });

  describe("getCashFlowSummary", () => {
    it("returns summary for date range", () => {
      addCashFlowEntry({
        type: "inflow",
        category: "sales",
        description: "Product sale",
        amount: 100,
        date: "2024-01-15",
        status: "completed",
      });

      addCashFlowEntry({
        type: "outflow",
        category: "cogs",
        description: "Product cost",
        amount: 50,
        date: "2024-01-16",
        status: "completed",
      });

      const summary = getCashFlowSummary("2024-01-01", "2024-01-31");
      expect(summary.totalInflows).toBe(100);
      expect(summary.totalOutflows).toBe(50);
      expect(summary.netCashFlow).toBe(50);
    });
  });

  describe("validateCashFlowInput", () => {
    it("validates correct input", () => {
      const result = validateCashFlowInput({
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        startingBalance: 1000,
        entries: [],
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("rejects missing start date", () => {
      const result = validateCashFlowInput({
        startDate: "",
        endDate: "2024-01-31",
        startingBalance: 1000,
        entries: [],
      });

      expect(result.valid).toBe(false);
    });

    it("rejects missing end date", () => {
      const result = validateCashFlowInput({
        startDate: "2024-01-01",
        endDate: "",
        startingBalance: 1000,
        entries: [],
      });

      expect(result.valid).toBe(false);
    });

    it("rejects start date after end date", () => {
      const result = validateCashFlowInput({
        startDate: "2024-01-31",
        endDate: "2024-01-01",
        startingBalance: 1000,
        entries: [],
      });

      expect(result.valid).toBe(false);
    });
  });
});

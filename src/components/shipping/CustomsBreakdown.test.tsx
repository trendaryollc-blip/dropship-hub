import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CustomsBreakdown from "./CustomsBreakdown";
import type { CustomsCalculationResult } from "@/types/shipping";

const mockResult: CustomsCalculationResult = {
  requestId: "req-1",
  originCountry: "CN",
  destinationCountry: "US",
  totalDeclaredValue: 50,
  totalWeight: 1,
  shippingCost: 10,
  currency: "USD",
  items: [
    {
      name: "Wireless Earbuds",
      hsCode: "8518",
      quantity: 2,
      unitValue: 25,
      totalValue: 50,
      weightKg: 0.5,
      dutyRate: 0.049,
      dutyAmount: 2.45,
      vatRate: 0,
      vatAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      totalTaxes: 2.45,
      landedCost: 54.9,
      notes: ["Standard duty rate"],
    },
  ],
  summary: {
    subtotal: 50,
    shippingCost: 10,
    totalDuties: 2.45,
    totalVAT: 0,
    totalTaxes: 2.45,
    totalFees: 0,
    totalLandedCost: 62.45,
    effectiveTaxRate: 4.9,
    breakdown: [
      { name: "Subtotal", amount: 50, color: "#3b82f6" },
      { name: "Shipping", amount: 10, color: "#6b7280" },
      { name: "Duties", amount: 2.45, color: "#ef4444" },
    ],
  },
  deMinimis: {
    threshold: 800,
    currency: "USD",
    applies: true,
    explanation: "US de minimis threshold is $800 for imports.",
  },
  warnings: [
    { type: "high_duty", severity: "warning", message: "Duty rate above 5%" },
  ],
  tips: ["Consider consolidating shipments to reduce per-item costs"],
  calculatedAt: "2024-01-01T00:00:00Z",
};

describe("CustomsBreakdown", () => {
  it("renders summary cards", () => {
    render(<CustomsBreakdown result={mockResult} />);
    expect(screen.getAllByText("Subtotal").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Import Duties")).toBeInTheDocument();
    expect(screen.getByText("VAT/GST")).toBeInTheDocument();
    expect(screen.getByText("Total Landed Cost")).toBeInTheDocument();
  });

  it("displays subtotal value", () => {
    render(<CustomsBreakdown result={mockResult} />);
    expect(screen.getAllByText("$50.00").length).toBeGreaterThanOrEqual(1);
  });

  it("displays duties value", () => {
    render(<CustomsBreakdown result={mockResult} />);
    expect(screen.getAllByText("$2.45").length).toBeGreaterThanOrEqual(1);
  });

  it("displays landed cost", () => {
    render(<CustomsBreakdown result={mockResult} />);
    expect(screen.getByText("$62.45")).toBeInTheDocument();
  });

  it("shows cost breakdown section", () => {
    render(<CustomsBreakdown result={mockResult} />);
    expect(screen.getByText("Cost Breakdown")).toBeInTheDocument();
  });

  it("displays de minimis threshold", () => {
    render(<CustomsBreakdown result={mockResult} />);
    expect(screen.getByText("De Minimis Threshold")).toBeInTheDocument();
    expect(screen.getByText(/USD 800/)).toBeInTheDocument();
  });

  it("shows below threshold badge", () => {
    render(<CustomsBreakdown result={mockResult} />);
    expect(screen.getByText("Below threshold")).toBeInTheDocument();
  });

  it("shows item details", () => {
    render(<CustomsBreakdown result={mockResult} />);
    expect(screen.getByText("Item Details")).toBeInTheDocument();
    expect(screen.getByText("Wireless Earbuds")).toBeInTheDocument();
  });

  it("displays item HS code", () => {
    render(<CustomsBreakdown result={mockResult} />);
    expect(screen.getByText(/HS Code: 8518/)).toBeInTheDocument();
  });

  it("shows warnings section", () => {
    render(<CustomsBreakdown result={mockResult} />);
    expect(screen.getByText("Warnings")).toBeInTheDocument();
    expect(screen.getByText("Duty rate above 5%")).toBeInTheDocument();
  });

  it("shows tips section", () => {
    render(<CustomsBreakdown result={mockResult} />);
    expect(screen.getByText("Tips")).toBeInTheDocument();
    expect(screen.getByText(/consolidating shipments/)).toBeInTheDocument();
  });

  it("shows effective tax rate", () => {
    render(<CustomsBreakdown result={mockResult} />);
    expect(screen.getByText("Effective Tax Rate")).toBeInTheDocument();
    expect(screen.getAllByText("4.9%").length).toBeGreaterThanOrEqual(1);
  });

  it("shows above threshold when value exceeds", () => {
    const overThreshold = {
      ...mockResult,
      totalDeclaredValue: 1000,
      deMinimis: { ...mockResult.deMinimis },
    };
    render(<CustomsBreakdown result={overThreshold} />);
    expect(screen.getByText("Above threshold")).toBeInTheDocument();
  });
});

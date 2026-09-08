import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PriceComparisonTable from "./PriceComparisonTable";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: null, isLoading: false, error: null, mutate: vi.fn() }),
}));

vi.mock("lucide-react", () => ({
  DollarSign: (p: any) => <div data-testid="icon-dollar" />,
  TrendingUp: (p: any) => <div data-testid="icon-trending" />,
  Truck: (p: any) => <div data-testid="icon-truck" />,
  Star: (p: any) => <div data-testid="icon-star" />,
  Shield: (p: any) => <div data-testid="icon-shield" />,
  Crown: (p: any) => <div data-testid="icon-crown" />,
  Package: (p: any) => <div data-testid="icon-package" />,
  Loader2: (p: any) => <div data-testid="icon-loader" />,
  RefreshCw: (p: any) => <div data-testid="icon-refresh" />,
  Calculator: (p: any) => <div data-testid="icon-calculator" />,
  ArrowUpDown: (p: any) => <div data-testid="icon-arrow" />,
  Search: (p: any) => <div data-testid="icon-search" />,
}));

describe("PriceComparisonTable", () => {
  it("renders the search bar", () => {
    render(<PriceComparisonTable />);
    expect(screen.getByPlaceholderText(/Search product/)).toBeDefined();
  });

  it("renders price intelligence heading", () => {
    render(<PriceComparisonTable />);
    expect(screen.getByText("Price Intelligence")).toBeDefined();
  });

  it("renders selling price input", () => {
    render(<PriceComparisonTable />);
    expect(screen.getByPlaceholderText("Selling $")).toBeDefined();
  });

  it("renders compare button", () => {
    render(<PriceComparisonTable />);
    expect(screen.getByText("Compare")).toBeDefined();
  });

  it("renders empty state when no query", () => {
    render(<PriceComparisonTable />);
    expect(screen.getByText("Search for a product to compare prices")).toBeDefined();
  });

  it("pre-fills search when productQuery prop is provided", () => {
    render(<PriceComparisonTable productQuery="phone case" />);
    expect(screen.getByDisplayValue("phone case")).toBeDefined();
  });
});

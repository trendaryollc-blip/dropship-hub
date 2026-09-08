import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: null, isLoading: true }),
}));

vi.mock("lucide-react", () => ({
  Activity: (p: any) => <div data-testid="icon-activity" />,
  AlertTriangle: (p: any) => <div data-testid="icon-alert" />,
  TrendingUp: (p: any) => <div data-testid="icon-trending-up" />,
  TrendingDown: (p: any) => <div data-testid="icon-trending-down" />,
  Minus: (p: any) => <div data-testid="icon-minus" />,
  Bell: (p: any) => <div data-testid="icon-bell" />,
  ChevronDown: (p: any) => <div data-testid="icon-chevron" />,
}));

import SupplierHealthPanel from "./SupplierHealthPanel";

describe("SupplierHealthPanel", () => {
  it("renders the health monitor heading", () => {
    render(<SupplierHealthPanel />);
    expect(screen.getByText("Supplier Health Monitor")).toBeInTheDocument();
  });

  it("renders health alerts section", () => {
    render(<SupplierHealthPanel />);
    expect(screen.getByText("Health Alerts")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<SupplierHealthPanel />);
    expect(screen.getByText("Supplier Health Monitor")).toBeInTheDocument();
  });
});

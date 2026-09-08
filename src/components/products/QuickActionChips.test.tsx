import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuickActionChips from "./QuickActionChips";

vi.mock("lucide-react", () => ({
  Sparkles: (props: any) => <div data-testid="icon-sparkles" {...props} />,
  Search: (props: any) => <div data-testid="icon-search" {...props} />,
  Check: (props: any) => <div data-testid="icon-check" {...props} />,
  FileText: (props: any) => <div data-testid="icon-file" {...props} />,
  BarChart3: (props: any) => <div data-testid="icon-chart" {...props} />,
  TrendingUp: (props: any) => <div data-testid="icon-trending" {...props} />,
  Target: (props: any) => <div data-testid="icon-target" {...props} />,
  Truck: (props: any) => <div data-testid="icon-truck" {...props} />,
}));

describe("QuickActionChips", () => {
  it("returns null when no query", () => {
    const { container } = render(<QuickActionChips query="" onAction={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders all 6 action buttons", () => {
    render(<QuickActionChips query="wireless earbuds" onAction={vi.fn()} />);
    expect(screen.getByText("Validate Products")).toBeInTheDocument();
    expect(screen.getByText("Find Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Generate Listings")).toBeInTheDocument();
    expect(screen.getByText("Market Analysis")).toBeInTheDocument();
    expect(screen.getByText("Find Similar")).toBeInTheDocument();
    expect(screen.getByText("Calculate Profit")).toBeInTheDocument();
  });

  it("calls onAction with query interpolated", () => {
    const onAction = vi.fn();
    render(<QuickActionChips query="wireless earbuds" onAction={onAction} />);
    fireEvent.click(screen.getByText("Validate Products"));
    expect(onAction).toHaveBeenCalledWith(
      expect.stringContaining("wireless earbuds")
    );
  });

  it("disables buttons when disabled prop is true", () => {
    render(<QuickActionChips query="wireless earbuds" onAction={vi.fn()} disabled />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("renders section label", () => {
    render(<QuickActionChips query="wireless earbuds" onAction={vi.fn()} />);
    expect(screen.getByText("Quick AI Actions")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompetitorMonitor from "./CompetitorMonitor";

vi.mock("lucide-react", () => ({
  Eye: () => <div data-testid="eye" />,
  AlertTriangle: () => <div data-testid="alert-triangle" />,
  TrendingUp: () => <div data-testid="trending-up" />,
  TrendingDown: () => <div data-testid="trending-down" />,
  ChevronDown: () => <div data-testid="chevron-down" />,
  ChevronUp: () => <div data-testid="chevron-up" />,
}));

const mockChanges = [
  {
    id: "1",
    competitorName: "Competitor A",
    changeType: "price-drop",
    severity: "critical",
    product: "Widget Pro",
    oldValue: "$29.99",
    newValue: "$24.99",
    impact: "High",
    recommendation: "Consider price match",
    detectedAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "2",
    competitorName: "Competitor B",
    changeType: "price-increase",
    severity: "info",
    product: "Gadget X",
    oldValue: "$19.99",
    newValue: "$22.99",
    impact: "Medium",
    recommendation: "Maintain current price",
    detectedAt: "2025-01-15T11:00:00Z",
  },
];

const mockSummary = {
  totalChanges: 5,
  critical: 1,
  warnings: 2,
  opportunities: 2,
};

describe("CompetitorMonitor", () => {
  it("renders header with title", () => {
    render(
      <CompetitorMonitor
        changes={mockChanges}
        summary={mockSummary}
        onAskAI={vi.fn()}
      />
    );
    expect(screen.getByText("Competitor Monitor")).toBeInTheDocument();
  });

  it("renders summary stats", () => {
    render(
      <CompetitorMonitor
        changes={mockChanges}
        summary={mockSummary}
        onAskAI={vi.fn()}
      />
    );
    expect(screen.getByText(/5 changes detected/)).toBeInTheDocument();
  });

  it("shows critical count badge", () => {
    render(
      <CompetitorMonitor
        changes={mockChanges}
        summary={mockSummary}
        onAskAI={vi.fn()}
      />
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("expands to show changes when clicked", () => {
    render(
      <CompetitorMonitor
        changes={mockChanges}
        summary={mockSummary}
        onAskAI={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Competitor Monitor").closest("button")!);
    expect(screen.getByText("Competitor A")).toBeInTheDocument();
    expect(screen.getByText("Widget Pro")).toBeInTheDocument();
  });

  it("shows severity badges", () => {
    render(
      <CompetitorMonitor
        changes={mockChanges}
        summary={mockSummary}
        onAskAI={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Competitor Monitor").closest("button")!);
    expect(screen.getByText("critical")).toBeInTheDocument();
    expect(screen.getByText("info")).toBeInTheDocument();
  });

  it("shows price changes", () => {
    render(
      <CompetitorMonitor
        changes={mockChanges}
        summary={mockSummary}
        onAskAI={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Competitor Monitor").closest("button")!);
    expect(screen.getByText("$29.99")).toBeInTheDocument();
    expect(screen.getByText("$24.99")).toBeInTheDocument();
  });

  it("shows recommendations", () => {
    render(
      <CompetitorMonitor
        changes={mockChanges}
        summary={mockSummary}
        onAskAI={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Competitor Monitor").closest("button")!);
    expect(screen.getByText("Consider price match")).toBeInTheDocument();
  });

  it("calls onAskAI when opportunities button clicked", () => {
    const onAskAI = vi.fn();
    render(
      <CompetitorMonitor
        changes={mockChanges}
        summary={mockSummary}
        onAskAI={onAskAI}
      />
    );
    fireEvent.click(screen.getByText("Competitor Monitor").closest("button")!);
    fireEvent.click(screen.getByText(/Ask AI/));
    expect(onAskAI).toHaveBeenCalled();
  });

  it("shows show more button when more than 4 changes", () => {
    const manyChanges = Array.from({ length: 6 }, (_, i) => ({
      ...mockChanges[0],
      id: String(i),
    }));
    render(
      <CompetitorMonitor
        changes={manyChanges}
        summary={mockSummary}
        onAskAI={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Competitor Monitor").closest("button")!);
    expect(screen.getByText(/Show 2 more/)).toBeInTheDocument();
  });
});

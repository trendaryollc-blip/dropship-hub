import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LiveIntelligenceFeedCard from "./LiveIntelligenceFeedCard";
import type { SmartAlert } from "@/types/dashboard";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

const mockAlerts: SmartAlert[] = [
  {
    id: "a1",
    type: "opportunity",
    title: "Price Drop Detected",
    description: "Product X dropped 20% in price",
    action: "View Deal",
    actionHref: "/products/1",
    timestamp: "12m ago",
    read: false,
    confidence: 94,
    aiAnalysis: "AI analysis shows strong opportunity",
    sparkline: [5, 4, 3, 2, 1],
  },
  {
    id: "a2",
    type: "risk",
    title: "Supplier Delay Risk",
    description: "Supplier Y response time increased",
    action: "Check Supplier",
    actionHref: "/suppliers/2",
    timestamp: "1h ago",
    read: true,
    confidence: 87,
    aiAnalysis: "AI analysis indicates potential delay",
    sparkline: [4, 5, 6, 7, 8],
  },
  {
    id: "a3",
    type: "info",
    title: "Trend Alert",
    description: "Bluetooth accessories trending up",
    action: "View Trends",
    actionHref: "/trends",
    timestamp: "3h ago",
    read: false,
    confidence: 78,
    aiAnalysis: "AI analysis shows upward trend",
    sparkline: [1, 2, 3, 4, 5],
  },
];

describe("LiveIntelligenceFeedCard", () => {
  it("renders heading", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("Live Intelligence Feed")).toBeInTheDocument();
  });

  it("renders live indicator", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders unread count", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("2 new")).toBeInTheDocument();
  });

  it("renders mark all read button when unread alerts exist", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("Mark all read")).toBeInTheDocument();
  });

  it("calls onReadAll when mark all read clicked", () => {
    const onReadAll = vi.fn();
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={onReadAll} />);
    fireEvent.click(screen.getByText("Mark all read"));
    expect(onReadAll).toHaveBeenCalledTimes(1);
  });

  it("renders filter tabs", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Opps")).toBeInTheDocument();
    expect(screen.getByText("Risks")).toBeInTheDocument();
    expect(screen.getByText("Trends")).toBeInTheDocument();
  });

  it("renders tab counts", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    const allTab = screen.getByText("All").closest("button");
    expect(allTab?.textContent).toContain("3");
  });

  it("filters alerts when tab clicked", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    fireEvent.click(screen.getByText("Opps"));
    expect(screen.getByText("Price Drop Detected")).toBeInTheDocument();
    expect(screen.queryByText("Supplier Delay Risk")).toBeNull();
  });

  it("filters risk alerts", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    fireEvent.click(screen.getByText("Risks"));
    expect(screen.getByText("Supplier Delay Risk")).toBeInTheDocument();
    expect(screen.queryByText("Price Drop Detected")).toBeNull();
  });

  it("filters info alerts", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    fireEvent.click(screen.getByText("Trends"));
    expect(screen.getByText("Trend Alert")).toBeInTheDocument();
    expect(screen.queryByText("Price Drop Detected")).toBeNull();
  });

  it("shows all alerts when All tab clicked", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    fireEvent.click(screen.getByText("Opps"));
    fireEvent.click(screen.getByText("All"));
    expect(screen.getByText("Price Drop Detected")).toBeInTheDocument();
    expect(screen.getByText("Supplier Delay Risk")).toBeInTheDocument();
    expect(screen.getByText("Trend Alert")).toBeInTheDocument();
  });

  it("renders alert titles", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("Price Drop Detected")).toBeInTheDocument();
    expect(screen.getByText("Supplier Delay Risk")).toBeInTheDocument();
    expect(screen.getByText("Trend Alert")).toBeInTheDocument();
  });

  it("renders alert descriptions", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("Product X dropped 20% in price")).toBeInTheDocument();
    expect(screen.getByText("Supplier Y response time increased")).toBeInTheDocument();
  });

  it("renders alert confidence", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("94%")).toBeInTheDocument();
    expect(screen.getByText("87%")).toBeInTheDocument();
  });

  it("renders alert timestamps", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("12m ago")).toBeInTheDocument();
    expect(screen.getByText("1h ago")).toBeInTheDocument();
  });

  it("renders action links", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    const viewDeal = screen.getByText("View Deal").closest("a");
    expect(viewDeal).toHaveAttribute("href", "/products/1");
  });

  it("shows unread dot for unread alerts", () => {
    const { container } = render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    const unreadDots = container.querySelectorAll(".bg-accent.rounded-full:not(.animate-pulse)");
    expect(unreadDots.length).toBeGreaterThanOrEqual(2);
  });

  it("toggles AI analysis on expand", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    const aiButtons = screen.getAllByText(/AI/);
    fireEvent.click(aiButtons[0]);
    expect(screen.getByText("AI Analysis")).toBeInTheDocument();
  });

  it("collapses AI analysis on second click", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("Price Drop Detected")).toBeInTheDocument();
  });

  it("renders empty state when no alerts", () => {
    render(<LiveIntelligenceFeedCard alerts={[]} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("No alerts yet")).toBeInTheDocument();
  });

  it("does not show mark all read when all read", () => {
    const allRead = mockAlerts.map((a) => ({ ...a, read: true }));
    render(<LiveIntelligenceFeedCard alerts={allRead} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.queryByText("Mark all read")).toBeNull();
  });

  it("renders View Full Intelligence link", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    const link = screen.getByText("View Full Intelligence").closest("a");
    expect(link).toHaveAttribute("href", "/intelligence");
  });

  it("limits displayed alerts to 6", () => {
    const manyAlerts = Array.from({ length: 10 }, (_, i) => ({
      ...mockAlerts[0],
      id: `a${i}`,
      title: `Alert ${i}`,
    }));
    render(<LiveIntelligenceFeedCard alerts={manyAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("Alert 0")).toBeInTheDocument();
    expect(screen.getByText("Alert 5")).toBeInTheDocument();
    expect(screen.queryByText("Alert 6")).toBeNull();
  });

  it("renders unread count badge", () => {
    render(<LiveIntelligenceFeedCard alerts={mockAlerts} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("2 new")).toBeInTheDocument();
  });
});

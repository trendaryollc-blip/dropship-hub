import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActionQueue from "./ActionQueue";

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <div data-testid="alert-triangle" />,
  Zap: () => <div data-testid="zap" />,
  TrendingUp: () => <div data-testid="trending-up" />,
  Clock: () => <div data-testid="clock" />,
  ArrowRight: () => <div data-testid="arrow-right" />,
}));

function createMockContext(overrides: Record<string, any> = {}) {
  return {
    alerts: { critical: [], unread: 0, opportunities: [] },
    revenue: { today: 100, yesterday: 80, trend: "up", totalOrders: 5, profitMargin: 25 },
    products: { totalTracked: 10, byStage: { winning: 2, scaling: 3, sunset: 0, saturation: 0 } },
    suppliers: { totalActive: 3, avgReliability: 85, criticalAlerts: [] },
    orders: { totalRouted: 10, pendingRouting: 1 },
    customerService: { activeConversations: 2, escalatedQueue: 0, recentEscalations: [], resolutionRate: 90 },
    store: { connected: 1, productsLive: 5, productsErrored: 0 },
    missions: { totalToday: 5, completedToday: 5 },
    ...overrides,
  };
}

describe("ActionQueue", () => {
  it("renders loading skeleton when context is null", () => {
    render(<ActionQueue context={null} onSendPrompt={vi.fn()} />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders all clear message when no actions needed", () => {
    const context = createMockContext();
    render(<ActionQueue context={context} onSendPrompt={vi.fn()} />);
    expect(screen.getByText("All Clear!")).toBeInTheDocument();
  });

  it("renders escalation action when there are escalated conversations", () => {
    const context = createMockContext({
      customerService: {
        activeConversations: 2,
        escalatedQueue: 2,
        recentEscalations: [{ customerName: "John", reason: "Refund issue" }],
        resolutionRate: 90,
      },
    });
    render(<ActionQueue context={context} onSendPrompt={vi.fn()} />);
    expect(screen.getByText(/Handle 2 escalated/)).toBeInTheDocument();
  });

  it("renders supplier alert action", () => {
    const context = createMockContext({
      suppliers: {
        totalActive: 3,
        avgReliability: 85,
        criticalAlerts: [{ supplierName: "CJ", title: "Low stock", description: "Running out of widgets" }],
      },
    });
    render(<ActionQueue context={context} onSendPrompt={vi.fn()} />);
    expect(screen.getByText(/Supplier issue: CJ/)).toBeInTheDocument();
  });

  it("renders revenue drop action", () => {
    const context = createMockContext({
      revenue: { today: 50, yesterday: 100, trend: "down", totalOrders: 5, profitMargin: 25 },
    });
    render(<ActionQueue context={context} onSendPrompt={vi.fn()} />);
    expect(screen.getByText("Revenue is trending down")).toBeInTheDocument();
  });

  it("renders sunset products action", () => {
    const context = createMockContext({
      products: { totalTracked: 10, byStage: { winning: 2, scaling: 3, sunset: 3, saturation: 0 } },
    });
    render(<ActionQueue context={context} onSendPrompt={vi.fn()} />);
    expect(screen.getByText(/3 products in sunset/)).toBeInTheDocument();
  });

  it("renders saturation products action", () => {
    const context = createMockContext({
      products: { totalTracked: 10, byStage: { winning: 2, scaling: 3, sunset: 0, saturation: 2 } },
    });
    render(<ActionQueue context={context} onSendPrompt={vi.fn()} />);
    expect(screen.getByText(/2 products in saturation/)).toBeInTheDocument();
  });

  it("renders missions action", () => {
    const context = createMockContext({
      missions: { totalToday: 5, completedToday: 2 },
    });
    render(<ActionQueue context={context} onSendPrompt={vi.fn()} />);
    expect(screen.getByText(/3 missions left/)).toBeInTheDocument();
  });

  it("renders store errors action", () => {
    const context = createMockContext({
      store: { connected: 1, productsLive: 5, productsErrored: 4 },
    });
    render(<ActionQueue context={context} onSendPrompt={vi.fn()} />);
    expect(screen.getByText(/4 products with errors/)).toBeInTheDocument();
  });

  it("renders no store connected action", () => {
    const context = createMockContext({
      store: { connected: 0, productsLive: 0, productsErrored: 0 },
    });
    render(<ActionQueue context={context} onSendPrompt={vi.fn()} />);
    expect(screen.getByText("No store connected")).toBeInTheDocument();
  });

  it("calls onSendPrompt when action clicked", () => {
    const onSendPrompt = vi.fn();
    const context = createMockContext({
      customerService: { activeConversations: 2, escalatedQueue: 1, recentEscalations: [], resolutionRate: 90 },
    });
    render(<ActionQueue context={context} onSendPrompt={onSendPrompt} />);
    const button = screen.getByText(/Handle 1 escalated/).closest("button");
    fireEvent.click(button!);
    expect(onSendPrompt).toHaveBeenCalled();
  });

  it("limits actions to 6", () => {
    const context = createMockContext({
      customerService: { activeConversations: 2, escalatedQueue: 1, recentEscalations: [], resolutionRate: 90 },
      products: { totalTracked: 10, byStage: { winning: 2, scaling: 3, sunset: 1, saturation: 1 } },
      missions: { totalToday: 5, completedToday: 2 },
      store: { connected: 0, productsLive: 0, productsErrored: 1 },
    });
    render(<ActionQueue context={context} onSendPrompt={vi.fn()} />);
    const buttons = document.querySelectorAll("button");
    expect(buttons.length).toBeLessThanOrEqual(7);
  });
});

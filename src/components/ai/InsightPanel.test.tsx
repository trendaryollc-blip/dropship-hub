import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import InsightPanel from "./InsightPanel";

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <div data-testid="icon" />,
  TrendingUp: () => <div data-testid="icon" />,
  Zap: () => <div data-testid="icon" />,
  DollarSign: () => <div data-testid="icon" />,
  ArrowRight: () => <div data-testid="icon" />,
  ShoppingCart: () => <div data-testid="icon" />,
  Truck: () => <div data-testid="icon" />,
  MessageSquare: () => <div data-testid="icon" />,
  Store: () => <div data-testid="icon" />,
  Package: () => <div data-testid="icon" />,
  Target: () => <div data-testid="icon" />,
  Activity: () => <div data-testid="icon" />,
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
    ...overrides,
  };
}

describe("InsightPanel", () => {
  it("renders loading skeleton when context is null", () => {
    render(<InsightPanel context={null} onNavigate={vi.fn()} />);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders critical issues when alerts exist", () => {
    const ctx = createMockContext({
      alerts: { critical: [{ title: "Stock Alert", description: "Out of stock", type: "inventory" }], unread: 1, opportunities: [] },
    });
    render(<InsightPanel context={ctx} onNavigate={vi.fn()} />);
    expect(screen.getByText("Stock Alert")).toBeInTheDocument();
  });

  it("renders opportunities section", () => {
    const ctx = createMockContext({
      alerts: { critical: [], unread: 0, opportunities: [{ title: "New Trend", description: "Pet gadgets" }] },
    });
    render(<InsightPanel context={ctx} onNavigate={vi.fn()} />);
    expect(screen.getByText("New Trend")).toBeInTheDocument();
  });

  it("renders today's numbers", () => {
    render(<InsightPanel context={createMockContext()} onNavigate={vi.fn()} />);
    expect(screen.getByText("Today's Numbers")).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("renders quick navigation", () => {
    render(<InsightPanel context={createMockContext()} onNavigate={vi.fn()} />);
    expect(screen.getByText("Quick Navigate")).toBeInTheDocument();
    expect(screen.getByText("Suppliers")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CrossPageStatus from "./CrossPageStatus";

vi.mock("lucide-react", () => ({
  LayoutDashboard: () => <div data-testid="layout-dashboard" />,
  Package: () => <div data-testid="package" />,
  Truck: () => <div data-testid="truck" />,
  DollarSign: () => <div data-testid="dollar-sign" />,
  ShoppingCart: () => <div data-testid="shopping-cart" />,
  MessageSquare: () => <div data-testid="message-square" />,
  Store: () => <div data-testid="store" />,
  Activity: () => <div data-testid="activity" />,
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

describe("CrossPageStatus", () => {
  it("renders loading skeleton when context is null", () => {
    render(<CrossPageStatus context={null} />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders all page status items", () => {
    const context = createMockContext();
    render(<CrossPageStatus context={context} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("CS")).toBeInTheDocument();
    expect(screen.getByText("Store")).toBeInTheDocument();
    expect(screen.getByText("Lifecycle")).toBeInTheDocument();
  });

  it("shows critical status for escalated CS", () => {
    const context = createMockContext({
      customerService: { escalatedQueue: 2 },
    });
    render(<CrossPageStatus context={context} />);
    expect(screen.getByText("2 escalated")).toBeInTheDocument();
  });

  it("shows healthy status for good metrics", () => {
    const context = createMockContext();
    render(<CrossPageStatus context={context} />);
    expect(screen.getByText("85% reliable")).toBeInTheDocument();
  });

  it("links to correct pages", () => {
    const context = createMockContext();
    render(<CrossPageStatus context={context} />);
    const links = document.querySelectorAll("a");
    expect(links[0]).toHaveAttribute("href", "/dashboard");
    expect(links[1]).toHaveAttribute("href", "/products");
  });
});

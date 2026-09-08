import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PromptCardGrid from "./PromptCardGrid";

vi.mock("lucide-react", () => ({
  Sun: () => <div data-testid="sun" />,
  Heart: () => <div data-testid="heart" />,
  AlertTriangle: () => <div data-testid="alert-triangle" />,
  ClipboardList: () => <div data-testid="clipboard-list" />,
  DollarSign: () => <div data-testid="dollar-sign" />,
  Truck: () => <div data-testid="truck" />,
  Package: () => <div data-testid="package" />,
  MessageSquare: () => <div data-testid="message-square" />,
  Eye: () => <div data-testid="eye" />,
  Store: () => <div data-testid="store" />,
  Scan: () => <div data-testid="scan" />,
  TrendingUp: () => <div data-testid="trending-up" />,
  BarChart3: () => <div data-testid="bar-chart" />,
  Target: () => <div data-testid="target" />,
  Sparkles: () => <div data-testid="sparkles" />,
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: vi.fn().mockReturnValue({ user: { uid: "user-1" } }),
}));

const mockContext = {
  revenue: { today: 100, yesterday: 80, thisWeek: 500, trend: "up" as const, totalOrders: 5, profitMargin: 25 },
  products: { totalTracked: 10, byStage: { winning: 2, scaling: 3, sunset: 0, saturation: 0 } },
  suppliers: { totalActive: 3, avgReliability: 85, criticalAlerts: [] },
  orders: { totalRouted: 10, pendingRouting: 1 },
  customerService: { activeConversations: 2, escalatedQueue: 0, recentEscalations: [], resolutionRate: 90 },
  store: { connected: 1, productsLive: 5, productsErrored: 0 },
  missions: { totalToday: 5, completedToday: 3 },
  healthScore: { overall: 85 },
  alerts: { critical: [], unread: 0, opportunities: [] },
  competitors: { recentlyAnalyzed: 3 },
};

describe("PromptCardGrid", () => {
  it("renders prompt cards", () => {
    render(<PromptCardGrid context={mockContext} onSendPrompt={vi.fn()} />);
    expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    expect(screen.getByText("Business Health")).toBeInTheDocument();
  });

  it("calls onSendPrompt when card clicked", () => {
    const onSendPrompt = vi.fn();
    render(<PromptCardGrid context={mockContext} onSendPrompt={onSendPrompt} />);
    fireEvent.click(screen.getByText("Morning Briefing"));
    expect(onSendPrompt).toHaveBeenCalled();
  });

  it("applies grid layout", () => {
    const { container } = render(<PromptCardGrid context={mockContext} onSendPrompt={vi.fn()} />);
    expect(container.firstChild).toHaveClass("grid");
  });

  it("renders cards with no badges when context is null", () => {
    render(<PromptCardGrid context={null} onSendPrompt={vi.fn()} />);
    expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    expect(screen.getByText("Business Health")).toBeInTheDocument();
  });
});

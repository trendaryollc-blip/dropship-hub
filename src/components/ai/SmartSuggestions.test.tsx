import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SmartSuggestions from "./SmartSuggestions";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: vi.fn().mockReturnValue({ user: { uid: "user-1" } }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn().mockReturnValue({ data: null, isLoading: false, mutate: vi.fn() }),
}));

vi.mock("lucide-react", () => ({
  TrendingUp: () => <div data-testid="icon" />,
  DollarSign: () => <div data-testid="icon" />,
  AlertTriangle: () => <div data-testid="icon" />,
  Sparkles: () => <div data-testid="icon" />,
  Store: () => <div data-testid="icon" />,
  ArrowUpRight: () => <div data-testid="icon" />,
  RefreshCw: () => <div data-testid="icon" />,
  Bell: () => <div data-testid="icon" />,
  ChevronRight: () => <div data-testid="icon" />,
  Clock: () => <div data-testid="icon" />,
  ShoppingCart: () => <div data-testid="icon" />,
  Target: () => <div data-testid="icon" />,
  Zap: () => <div data-testid="icon" />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("SmartSuggestions", () => {
  it("renders title", () => {
    render(<SmartSuggestions />);
    expect(screen.getByText("Smart Alerts")).toBeInTheDocument();
  });

  it("renders default suggestions", () => {
    render(<SmartSuggestions />);
    expect(screen.getByText("Pet GPS Trackers +340%")).toBeInTheDocument();
    expect(screen.getByText("Earbuds source price dropped")).toBeInTheDocument();
  });

  it("renders suggestion count", () => {
    render(<SmartSuggestions />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("expands/collapses on click", () => {
    render(<SmartSuggestions />);
    const header = screen.getByText("Smart Alerts").closest("button");
    fireEvent.click(header!);
    expect(screen.queryByText("Pet GPS Trackers +340%")).not.toBeInTheDocument();
  });
});

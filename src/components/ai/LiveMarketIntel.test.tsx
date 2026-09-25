import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LiveMarketIntel from "./LiveMarketIntel";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: vi.fn().mockReturnValue({ user: { uid: "user-1" } }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn().mockReturnValue({ data: null, isLoading: false, mutate: vi.fn() }),
}));

vi.mock("lucide-react", () => ({
  TrendingUp: () => <div data-testid="icon" />,
  Flame: () => <div data-testid="icon" />,
  Zap: () => <div data-testid="icon" />,
  ArrowUpRight: () => <div data-testid="icon" />,
  RefreshCw: () => <div data-testid="icon" />,
  Globe: () => <div data-testid="icon" />,
  BarChart3: () => <div data-testid="icon" />,
  ShoppingCart: () => <div data-testid="icon" />,
  KeyRound: () => <div data-testid="icon" />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("LiveMarketIntel", () => {
  it("renders title", () => {
    render(<LiveMarketIntel />);
    expect(screen.getByText("Market Intel")).toBeInTheDocument();
  });

  it("shows honest empty state instead of fabricated trending products", () => {
    render(<LiveMarketIntel />);
    expect(screen.getByText("No market signals yet")).toBeInTheDocument();
    expect(
      screen.getByText("Market intel needs a live shopping/trend source (not connected)")
    ).toBeInTheDocument();
    expect(screen.queryByText("Pet GPS Tracker")).not.toBeInTheDocument();
  });

  it("does not render fabricated footer stats", () => {
    render(<LiveMarketIntel />);
    expect(screen.queryByText("847")).not.toBeInTheDocument();
    expect(screen.queryByText("+12%")).not.toBeInTheDocument();
  });

  it("renders trending tab", () => {
    render(<LiveMarketIntel />);
    expect(screen.getByText("Trending")).toBeInTheDocument();
  });

  it("renders alerts tab", () => {
    render(<LiveMarketIntel />);
    expect(screen.getByText("Alerts")).toBeInTheDocument();
  });

  it("shows empty state on alerts tab when API returns nothing", () => {
    render(<LiveMarketIntel />);
    fireEvent.click(screen.getByText("Alerts"));
    expect(screen.getByText("No market signals yet")).toBeInTheDocument();
  });
});

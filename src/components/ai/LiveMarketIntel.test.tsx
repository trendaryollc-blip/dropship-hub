import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("LiveMarketIntel", () => {
  it("renders title", () => {
    render(<LiveMarketIntel />);
    expect(screen.getByText("Market Intel")).toBeInTheDocument();
  });

  it("renders default trending products", () => {
    render(<LiveMarketIntel />);
    expect(screen.getByText("Pet GPS Tracker")).toBeInTheDocument();
    expect(screen.getByText("Posture Corrector")).toBeInTheDocument();
  });

  it("renders trending tab", () => {
    render(<LiveMarketIntel />);
    expect(screen.getByText("Trending")).toBeInTheDocument();
  });

  it("renders alerts tab", () => {
    render(<LiveMarketIntel />);
    expect(screen.getByText("Alerts")).toBeInTheDocument();
  });
});

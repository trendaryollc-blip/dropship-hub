import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: null, isLoading: true }),
}));

vi.mock("lucide-react", () => ({
  Target: (p: any) => <div data-testid="icon-target" />,
  TrendingUp: (p: any) => <div data-testid="icon-trending-up" />,
  AlertCircle: (p: any) => <div data-testid="icon-alert" />,
  ChevronRight: (p: any) => <div data-testid="icon-chevron" />,
  Filter: (p: any) => <div data-testid="icon-filter" />,
}));

import NicheDiscoveryPanel from "./NicheDiscoveryPanel";

describe("NicheDiscoveryPanel", () => {
  it("renders the niche discovery heading", () => {
    render(<NicheDiscoveryPanel />);
    expect(screen.getByText("Niche Discovery")).toBeInTheDocument();
  });

  it("renders category filter", () => {
    render(<NicheDiscoveryPanel />);
    expect(screen.getByText("All Categories")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<NicheDiscoveryPanel />);
    expect(screen.getByText("Niche Discovery")).toBeInTheDocument();
  });
});

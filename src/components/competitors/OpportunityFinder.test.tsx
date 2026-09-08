import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OpportunityFinder from "./OpportunityFinder";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("lucide-react", () => ({
  Zap: () => <div data-testid="zap" />,
  AlertTriangle: () => <div data-testid="alert-triangle" />,
  ShieldAlert: () => <div data-testid="shield-alert" />,
  ArrowRight: () => <div data-testid="arrow-right" />,
  X: () => <div data-testid="x" />,
}));

const mockOpportunities = [
  {
    type: "opportunity" as const,
    title: "Underpriced Wireless Mice",
    description: "Several sellers pricing below market average",
    count: 5,
    potentialMargin: 45,
    actionLabel: "Explore deals",
  },
  {
    type: "gap" as const,
    title: "Premium Segment Gap",
    description: "No mid-range options available",
    count: 3,
    actionLabel: "Fill the gap",
  },
  {
    type: "avoid" as const,
    title: "Saturated Budget Tier",
    description: "Too much price competition",
    count: 12,
    actionLabel: "Skip this tier",
  },
];

describe("OpportunityFinder", () => {
  it("renders heading", () => {
    render(<OpportunityFinder opportunities={mockOpportunities} />);
    expect(screen.getByText("AI Opportunity Finder")).toBeInTheDocument();
  });

  it("renders all opportunity cards with titles", () => {
    render(<OpportunityFinder opportunities={mockOpportunities} />);
    expect(screen.getByText("Underpriced Wireless Mice")).toBeInTheDocument();
    expect(screen.getByText("Premium Segment Gap")).toBeInTheDocument();
    expect(screen.getByText("Saturated Budget Tier")).toBeInTheDocument();
  });

  it("displays type badges for each card", () => {
    render(<OpportunityFinder opportunities={mockOpportunities} />);
    expect(screen.getByText("OPPORTUNITY")).toBeInTheDocument();
    expect(screen.getByText("PRICING GAP")).toBeInTheDocument();
    expect(screen.getByText("AVOID")).toBeInTheDocument();
  });

  it("shows potential margin for opportunity cards", () => {
    render(<OpportunityFinder opportunities={mockOpportunities} />);
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("opens detail modal on card click", () => {
    render(<OpportunityFinder opportunities={mockOpportunities} />);
    fireEvent.click(screen.getByText("Underpriced Wireless Mice"));
    expect(screen.getByText("Action Items")).toBeInTheDocument();
    expect(screen.getByText("Got it")).toBeInTheDocument();
  });
});

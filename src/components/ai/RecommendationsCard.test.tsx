import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RecommendationsCard from "./RecommendationsCard";

vi.mock("lucide-react", () => ({
  Sparkles: () => <div data-testid="icon" />,
  TrendingUp: () => <div data-testid="icon" />,
  ChevronDown: () => <div data-testid="icon" />,
  ChevronUp: () => <div data-testid="icon" />,
  ExternalLink: () => <div data-testid="icon" />,
}));

const mockRecommendations = [
  { id: "1", title: "Pet GPS Trackers", category: "Electronics", sourcePrice: 15, suggestedSellPrice: 35, estimatedMargin: 57, confidence: 92, reason: "High demand", matchType: "trending", riskLevel: "low", competitionLevel: "medium", matchScore: 88, reasoning: "Great opportunity", tags: ["hot"] },
  { id: "2", title: "Posture Corrector", category: "Health", sourcePrice: 8, suggestedSellPrice: 25, estimatedMargin: 68, confidence: 87, reason: "Trending", matchType: "high-margin", riskLevel: "low", competitionLevel: "low", matchScore: 85, reasoning: "Strong potential", tags: ["new"] },
];

describe("RecommendationsCard", () => {
  it("renders title", () => {
    render(<RecommendationsCard recommendations={mockRecommendations} onAskAI={vi.fn()} />);
    expect(screen.getByText("Product Recommendations")).toBeInTheDocument();
  });

  it("renders recommendation count", () => {
    render(<RecommendationsCard recommendations={mockRecommendations} onAskAI={vi.fn()} />);
    expect(screen.getByText("2 products matched to your business")).toBeInTheDocument();
  });

  it("expands to show recommendations", () => {
    render(<RecommendationsCard recommendations={mockRecommendations} onAskAI={vi.fn()} />);
    fireEvent.click(screen.getByText("Product Recommendations").closest("button")!);
    expect(screen.getByText("Pet GPS Trackers")).toBeInTheDocument();
    expect(screen.getByText("Posture Corrector")).toBeInTheDocument();
  });

  it("renders recommendation details when expanded", () => {
    render(<RecommendationsCard recommendations={mockRecommendations} onAskAI={vi.fn()} />);
    fireEvent.click(screen.getByText("Product Recommendations").closest("button")!);
    expect(screen.getByText("$15")).toBeInTheDocument();
    expect(screen.getByText("$35")).toBeInTheDocument();
    expect(screen.getByText("57%")).toBeInTheDocument();
  });

  it("returns null for empty recommendations", () => {
    const { container } = render(<RecommendationsCard recommendations={[]} onAskAI={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("calls onAskAI when ask button clicked", () => {
    const onAskAI = vi.fn();
    render(<RecommendationsCard recommendations={mockRecommendations} onAskAI={onAskAI} />);
    fireEvent.click(screen.getByText("Product Recommendations").closest("button")!);
    const askButtons = screen.getAllByText(/Ask AI about this product/);
    fireEvent.click(askButtons[0]);
    expect(onAskAI).toHaveBeenCalled();
  });
});

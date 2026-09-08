import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdCampaignAdvisor from "./AdCampaignAdvisor";

const mockSafeFetch = vi.fn();
vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: (...args: any[]) => mockSafeFetch(...args),
}));

vi.mock("lucide-react", () => ({
  Megaphone: () => <div data-testid="icon" />,
  TrendingUp: () => <div data-testid="icon" />,
  TrendingDown: () => <div data-testid="icon" />,
  AlertTriangle: () => <div data-testid="icon" />,
  Zap: () => <div data-testid="icon" />,
  ChevronDown: () => <div data-testid="icon" />,
  ChevronUp: () => <div data-testid="icon" />,
  ExternalLink: () => <div data-testid="icon" />,
}));

describe("AdCampaignAdvisor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders panel title", () => {
    render(<AdCampaignAdvisor uid="user-1" />);
    expect(screen.getByText("Ad Campaign Advisor")).toBeInTheDocument();
  });

  it("renders Analyze button", () => {
    render(<AdCampaignAdvisor uid="user-1" />);
    expect(screen.getByText("Analyze")).toBeInTheDocument();
  });

  it("renders description when no data", () => {
    render(<AdCampaignAdvisor uid="user-1" />);
    expect(screen.getByText(/Click analyze to get AI-powered ad optimization advice/)).toBeInTheDocument();
  });

  it("shows loading skeletons when analyzing", async () => {
    mockSafeFetch.mockReturnValue(new Promise(() => {}));
    render(<AdCampaignAdvisor uid="user-1" />);
    fireEvent.click(screen.getByText("Analyze"));
    await waitFor(() => {
      expect(screen.getByText("Analyzing...")).toBeInTheDocument();
    });
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays campaign data after analysis", async () => {
    mockSafeFetch.mockResolvedValue({
      campaigns: [
        { name: "Summer Sale", adSpend: 500, revenue: 1500, profit: 1000, roas: 3.0, orders: 25, costPerOrder: 20, rating: "excellent", recommendation: "Scale this campaign", optimizationTips: ["Increase budget"] },
      ],
      summary: { totalAdSpend: 500, totalRevenue: 1500, overallROAS: 3.0, bestCampaign: "Summer Sale", worstCampaign: "Summer Sale", budgetRecommendation: "Increase budget" },
      insights: ["Great performance"],
    });
    render(<AdCampaignAdvisor uid="user-1" />);
    fireEvent.click(screen.getByText("Analyze"));
    await waitFor(() => expect(screen.getByText("Summer Sale")).toBeInTheDocument());
    expect(screen.getAllByText("3x").length).toBeGreaterThan(0);
  });

  it("displays empty campaigns message", async () => {
    mockSafeFetch.mockResolvedValue({
      campaigns: [],
      summary: { totalAdSpend: 0, totalRevenue: 0, overallROAS: 0, bestCampaign: "", worstCampaign: "", budgetRecommendation: "" },
      insights: [],
    });
    render(<AdCampaignAdvisor uid="user-1" />);
    fireEvent.click(screen.getByText("Analyze"));
    await waitFor(() => expect(screen.getByText(/No ad campaigns found/)).toBeInTheDocument());
  });

  it("displays insights", async () => {
    mockSafeFetch.mockResolvedValue({
      campaigns: [],
      summary: { totalAdSpend: 0, totalRevenue: 0, overallROAS: 0, bestCampaign: "", worstCampaign: "", budgetRecommendation: "" },
      insights: ["Consider reallocating budget"],
    });
    render(<AdCampaignAdvisor uid="user-1" />);
    fireEvent.click(screen.getByText("Analyze"));
    await waitFor(() => expect(screen.getByText("Consider reallocating budget")).toBeInTheDocument());
  });
});

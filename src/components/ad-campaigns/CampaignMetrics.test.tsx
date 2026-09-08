import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CampaignMetrics from "./CampaignMetrics";

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn(() => ({
    data: {
      campaigns: [
        {
          id: "c1",
          status: "active",
          metrics: { impressions: 5000, clicks: 250, conversions: 25, spend: 200, revenue: 800, roas: 4, cpc: 0.8, ctr: 5, conversionRate: 10 },
        },
        {
          id: "c2",
          status: "paused",
          metrics: { impressions: 1000, clicks: 50, conversions: 3, spend: 50, revenue: 100, roas: 2, cpc: 1, ctr: 5, conversionRate: 6 },
        },
      ],
    },
    isLoading: false,
  })),
}));

describe("CampaignMetrics", () => {
  it("renders all KPI cards", () => {
    render(<CampaignMetrics />);
    expect(screen.getByText("Total Spend")).toBeDefined();
    expect(screen.getByText("Total Revenue")).toBeDefined();
    expect(screen.getByText("Avg ROAS")).toBeDefined();
    expect(screen.getByText("Total Clicks")).toBeDefined();
    expect(screen.getByText("Conversions")).toBeDefined();
  });

  it("calculates and displays total spend", () => {
    render(<CampaignMetrics />);
    expect(screen.getByText("$250")).toBeDefined();
  });

  it("calculates and displays total revenue", () => {
    render(<CampaignMetrics />);
    expect(screen.getByText("$900")).toBeDefined();
  });

  it("calculates and displays average ROAS", () => {
    render(<CampaignMetrics />);
    expect(screen.getByText("3.6x")).toBeDefined();
  });

  it("calculates and displays total clicks", () => {
    render(<CampaignMetrics />);
    expect(screen.getByText("300")).toBeDefined();
  });

  it("calculates and displays total conversions", () => {
    render(<CampaignMetrics />);
    expect(screen.getByText("28")).toBeDefined();
  });

  it("shows active and paused campaign counts", () => {
    render(<CampaignMetrics />);
    expect(screen.getByText("1 active")).toBeDefined();
    expect(screen.getByText("1 paused")).toBeDefined();
  });
});

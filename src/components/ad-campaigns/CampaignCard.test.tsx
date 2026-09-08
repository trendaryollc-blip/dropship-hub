import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CampaignCard from "./CampaignCard";

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ trigger: vi.fn(), isMutating: false })),
  revalidate: vi.fn(),
}));

const mockCampaign = {
  id: "c1",
  platform: "facebook",
  name: "Summer Sale",
  status: "active",
  productTitle: "Wireless Earbuds",
  dailyBudget: 100,
  startDate: "2025-01-01",
  metrics: {
    impressions: 5000,
    clicks: 250,
    conversions: 25,
    spend: 200,
    revenue: 800,
    roas: 4,
    cpc: 0.8,
    ctr: 5,
    conversionRate: 10,
  },
};

describe("CampaignCard", () => {
  it("renders campaign name and product title", () => {
    render(<CampaignCard campaign={mockCampaign} />);
    expect(screen.getByText("Summer Sale")).toBeDefined();
    expect(screen.getByText("Wireless Earbuds")).toBeDefined();
  });

  it("renders metrics correctly", () => {
    render(<CampaignCard campaign={mockCampaign} />);
    expect(screen.getByText("$200")).toBeDefined();
    expect(screen.getByText("250")).toBeDefined();
    expect(screen.getByText("25")).toBeDefined();
    expect(screen.getByText("4.0x")).toBeDefined();
  });

  it("renders platform badge", () => {
    render(<CampaignCard campaign={mockCampaign} />);
    expect(screen.getByText("facebook")).toBeDefined();
  });

  it("renders status badge", () => {
    render(<CampaignCard campaign={mockCampaign} />);
    expect(screen.getByText("active")).toBeDefined();
  });

  it("renders CTR, CPC, CR metrics", () => {
    render(<CampaignCard campaign={mockCampaign} />);
    expect(screen.getByText("CTR: 5.0%")).toBeDefined();
    expect(screen.getByText("CPC: $0.80")).toBeDefined();
    expect(screen.getByText("CR: 10.0%")).toBeDefined();
  });
});

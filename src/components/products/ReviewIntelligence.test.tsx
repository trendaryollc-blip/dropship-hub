import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReviewIntelligence from "./ReviewIntelligence";
import type { ReviewData } from "@/types/enrichment";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

const mockData: ReviewData = {
  totalReviews: 1234,
  averageRating: 4.2,
  distribution: [
    { stars: 5, percent: 60 },
    { stars: 4, percent: 25 },
    { stars: 3, percent: 10 },
    { stars: 2, percent: 3 },
    { stars: 1, percent: 2 },
  ],
  sentiment: {
    positive: ["Great quality", "Fast shipping"],
    neutral: ["Average product"],
    negative: ["Broke after a week"],
  },
  topKeywords: ["quality", "fast", "value"],
  commonPraise: ["Excellent build quality", "Fast delivery"],
  commonComplaints: ["Packaging could be better"],
  trustworthyScore: 82,
};

describe("ReviewIntelligence", () => {
  it("renders heading", () => {
    render(<ReviewIntelligence data={mockData} />);
    expect(screen.getByText("Review Intelligence")).toBeInTheDocument();
  });

  it("shows total reviews count", () => {
    render(<ReviewIntelligence data={mockData} />);
    const matches = screen.getAllByText(/1,234 reviews/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("displays average rating", () => {
    render(<ReviewIntelligence data={mockData} />);
    expect(screen.getByText("4.2")).toBeInTheDocument();
  });

  it("shows sentiment categories", () => {
    render(<ReviewIntelligence data={mockData} />);
    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("Neutral")).toBeInTheDocument();
    expect(screen.getByText("Negative")).toBeInTheDocument();
  });

  it("displays sentiment quotes", () => {
    render(<ReviewIntelligence data={mockData} />);
    expect(screen.getByText("Great quality")).toBeInTheDocument();
    expect(screen.getByText("Average product")).toBeInTheDocument();
    expect(screen.getByText("Broke after a week")).toBeInTheDocument();
  });

  it("shows top keywords", () => {
    render(<ReviewIntelligence data={mockData} />);
    expect(screen.getByText("quality")).toBeInTheDocument();
    expect(screen.getByText("fast")).toBeInTheDocument();
  });

  it("displays common praise and complaints", () => {
    render(<ReviewIntelligence data={mockData} />);
    expect(screen.getByText("Excellent build quality")).toBeInTheDocument();
    expect(screen.getByText("Packaging could be better")).toBeInTheDocument();
  });

  it("shows trustworthiness score", () => {
    render(<ReviewIntelligence data={mockData} />);
    expect(screen.getByText("Reviews Trustworthiness: 82/100")).toBeInTheDocument();
  });

  it("shows empty state when data is null", () => {
    render(<ReviewIntelligence data={null} />);
    expect(screen.getByText("Review data unavailable")).toBeInTheDocument();
  });

  it("shows distribution percentages", () => {
    render(<ReviewIntelligence data={mockData} />);
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("shows an honest note when the star breakdown is unavailable", () => {
    render(<ReviewIntelligence data={{ ...mockData, distribution: [] }} />);
    expect(screen.getByText(/Star breakdown unavailable/)).toBeInTheDocument();
    expect(screen.queryByText("60%")).not.toBeInTheDocument();
  });

  it("shows unavailable trust score instead of a fabricated number", () => {
    render(
      <ReviewIntelligence data={{ ...mockData, trustworthyScore: null, distribution: [] }} />
    );
    expect(screen.getByText("Reviews Trustworthiness: unavailable")).toBeInTheDocument();
    expect(screen.getByText(/no review text available from this source/)).toBeInTheDocument();
    expect(screen.queryByText(/Reviews Trustworthiness: \d+\/100/)).not.toBeInTheDocument();
  });

  it("labels estimated star ratings when ratingsEstimated is set", () => {
    render(<ReviewIntelligence data={{ ...mockData, ratingsEstimated: true }} />);
    expect(screen.getByText(/star ratings estimated from text/)).toBeInTheDocument();
    expect(screen.getByText("Estimated from review text — not official star ratings")).toBeInTheDocument();
    expect(screen.getByText(/star ratings were guessed from review text/)).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NicheRadarCards from "./NicheRadarCards";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const baseNiche = {
  scores: { demand: 85, profit: 78, competition: 72, trend: 90, seasonality: 80 },
  demandSparkline: [65, 70, 75, 82, 88, 90, 92] as number[],
};

function renderCard(props: Record<string, any> = {}) {
  const niche = {
    name: "Pet Tech & Wearables",
    category: "Pets",
    overallScore: 81,
    grade: "A",
    productCount: 342,
    avgMargin: 58,
    growth: 22,
    aiInsight: "Pet ownership booming.",
    topProduct: "Pet GPS Tracker",
    ...baseNiche,
    ...props,
  };
  return render(<NicheRadarCards niches={[niche]} />);
}

describe("NicheRadarCards", () => {
  it("renders niche names", () => {
    renderCard();
    expect(screen.getByText("Pet Tech & Wearables")).toBeInTheDocument();
  });

  it("renders grade badge for grade A", () => {
    renderCard({ grade: "A" });
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders grade badge for grade S", () => {
    renderCard({ grade: "S" });
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("renders grade badge for grade B", () => {
    renderCard({ grade: "B" });
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("renders grade badge for grade C", () => {
    renderCard({ grade: "C" });
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("renders positive growth with + sign", () => {
    renderCard({ growth: 22 });
    expect(screen.getByText("+22%")).toBeInTheDocument();
  });

  it("renders negative growth", () => {
    renderCard({ growth: -5 });
    expect(screen.getByText("-5%")).toBeInTheDocument();
  });

  it("shows expand toggle button", () => {
    renderCard();
    expect(screen.getByText("More details")).toBeInTheDocument();
  });

  it("expands to show less details toggle", () => {
    renderCard();
    fireEvent.click(screen.getByText("More details"));
    expect(screen.getByText("Less details")).toBeInTheDocument();
  });

  it("renders expanded section with score breakdown bars", () => {
    renderCard({ scores: { demand: 85, profit: 78, competition: 72, trend: 90, seasonality: 80 } });
    fireEvent.click(screen.getByText("More details"));
    expect(screen.getByText("Score Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Demand")).toBeInTheDocument();
    expect(screen.getByText("Profit")).toBeInTheDocument();
    expect(screen.getByText("Competition")).toBeInTheDocument();
    expect(screen.getByText("Trend")).toBeInTheDocument();
    expect(screen.getAllByText("Season").length).toBeGreaterThanOrEqual(1);
  });

  it("renders score values in expanded section", () => {
    renderCard({ scores: { demand: 85, profit: 78, competition: 72, trend: 90, seasonality: 80 } });
    fireEvent.click(screen.getByText("More details"));
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
  });

  it("renders top product in expanded section", () => {
    renderCard({ topProduct: "Pet GPS Tracker" });
    fireEvent.click(screen.getByText("More details"));
    expect(screen.getByText("Pet GPS Tracker")).toBeInTheDocument();
  });

  it("renders explore niche link in expanded section", () => {
    renderCard();
    fireEvent.click(screen.getByText("More details"));
    const exploreLink = screen.getByText("Explore Niche");
    expect(exploreLink).toBeInTheDocument();
    expect(exploreLink.closest("a")).toHaveAttribute("href", "/products/niches");
  });

  it("renders view all link", () => {
    renderCard();
    const viewAllLink = screen.getByText("View all");
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.closest("a")).toHaveAttribute("href", "/products/niches");
  });

  it("renders demand sparkline SVG", () => {
    renderCard();
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("renders product count", () => {
    renderCard({ productCount: 342 });
    expect(screen.getByText("342")).toBeInTheDocument();
  });

  it("renders average margin with %", () => {
    renderCard({ avgMargin: 58 });
    expect(screen.getByText("58%")).toBeInTheDocument();
  });

  it("renders overall score in ScoreRing", () => {
    renderCard({ overallScore: 81 });
    expect(screen.getByText("81")).toBeInTheDocument();
  });

  it("renders category label", () => {
    renderCard({ category: "Pets" });
    expect(screen.getByText("Pets")).toBeInTheDocument();
  });

  it("renders AI insight text", () => {
    renderCard({ aiInsight: "Pet ownership booming." });
    expect(screen.getByText("Pet ownership booming.")).toBeInTheDocument();
  });

  it("renders multiple niche cards", () => {
    render(
      <NicheRadarCards
        niches={[
          { name: "Card 1", category: "A", scores: { demand: 80, profit: 70, competition: 55, trend: 75, seasonality: 85 }, overallScore: 74, grade: "B", productCount: 100, avgMargin: 45, growth: 10, aiInsight: "Insight 1", topProduct: "Prod 1", demandSparkline: [10, 20, 30] },
          { name: "Card 2", category: "B", scores: { demand: 90, profit: 80, competition: 60, trend: 85, seasonality: 70 }, overallScore: 82, grade: "A", productCount: 200, avgMargin: 55, growth: 15, aiInsight: "Insight 2", topProduct: "Prod 2", demandSparkline: [40, 50, 60] },
        ]}
      />,
    );
    expect(screen.getByText("Card 1")).toBeInTheDocument();
    expect(screen.getByText("Card 2")).toBeInTheDocument();
  });

  it("expands and collapses toggle cycle", () => {
    renderCard();
    const btn = screen.getByText("More details");
    fireEvent.click(btn);
    expect(screen.getByText("Less details")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Less details"));
    expect(screen.getByText("More details")).toBeInTheDocument();
  });

  it("renders 7-day demand trend label", () => {
    renderCard();
    expect(screen.getByText("7-day demand trend")).toBeInTheDocument();
  });

  it("renders key metrics section in expanded", () => {
    renderCard();
    fireEvent.click(screen.getByText("More details"));
    expect(screen.getByText("Key Metrics")).toBeInTheDocument();
  });
});

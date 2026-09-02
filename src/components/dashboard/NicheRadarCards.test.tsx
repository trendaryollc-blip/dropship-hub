import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NicheRadarCards from "./NicheRadarCards";

describe("NicheRadarCards", () => {
  it("renders niche cards", () => {
    render(
      <NicheRadarCards
        niches={[
          {
            name: "Pet Tech & Wearables",
            category: "Pets",
            scores: { demand: 85, profit: 78, competition: 72, trend: 90, seasonality: 80 },
            overallScore: 81,
            grade: "A",
            productCount: 342,
            avgMargin: 58,
            growth: 22,
            aiInsight: "Pet ownership booming.",
            demandSparkline: [65, 70, 75, 82, 88, 90, 92],
            topProduct: "Pet GPS Tracker",
          },
          {
            name: "Home Office Ergonomics",
            category: "Office",
            scores: { demand: 75, profit: 82, competition: 68, trend: 70, seasonality: 85 },
            overallScore: 76,
            grade: "B+",
            productCount: 256,
            avgMargin: 62,
            growth: 15,
            aiInsight: "Remote work permanent.",
            demandSparkline: [55, 60, 65, 68, 72, 75, 78],
            topProduct: "Monitor Arm Mount",
          },
        ]}
      />
    );
    expect(screen.getByText("Pet Tech & Wearables")).toBeInTheDocument();
    expect(screen.getByText("Home Office Ergonomics")).toBeInTheDocument();
  });

  it("renders view all link", () => {
    render(
      <NicheRadarCards
        niches={[
          {
            name: "Kitchen Gadgets",
            category: "Kitchen",
            scores: { demand: 80, profit: 70, competition: 55, trend: 75, seasonality: 90 },
            overallScore: 74,
            grade: "B+",
            productCount: 412,
            avgMargin: 45,
            growth: 18,
            aiInsight: "Viral TikTok kitchen hacks.",
            demandSparkline: [80, 82, 83, 84, 85, 85, 85],
            topProduct: "Silicone Air Fryer Mat",
          },
        ]}
      />
    );
    expect(screen.getByText("View all")).toBeInTheDocument();
  });
});

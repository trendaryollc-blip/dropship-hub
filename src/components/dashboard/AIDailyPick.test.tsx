import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AIDailyPick from "./AIDailyPick";
import type { AIDailyPick as AIDailyPickType } from "@/types/dashboard";

const makePick = (overrides: Partial<AIDailyPickType> = {}): AIDailyPickType => ({
  title: "Wireless Earbuds Pro",
  category: "Electronics",
  image: "https://placehold.co/400x300",
  description: "Premium wireless earbuds with noise cancellation.",
  radarScores: { margin: 80, demand: 85, competition: 70, trend: 75, supplier: 90 },
  sourcePrice: 12.99,
  sellPrice: 32.99,
  margin: 61,
  risk: "low",
  reason: "High margin and strong demand.",
  platform: "AliExpress",
  ordersPerMonth: 2500,
  saturation: 35,
  overallScore: 87,
  earningsPreview: { profitPerOrder: 20, ordersPerMonth: 2500, monthlyRevenue: 50000 },
  reasonPoints: ["High demand trending", "Low competition niche", "Strong supplier rating"],
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  ...overrides,
});

describe("AIDailyPick", () => {
  it("renders product title", () => {
    render(<AIDailyPick pick={makePick()} />);
    expect(screen.getAllByText("Wireless Earbuds Pro").length).toBeGreaterThanOrEqual(1);
  });

  it("renders AI Product of the Day heading", () => {
    render(<AIDailyPick pick={makePick()} />);
    expect(screen.getByText("AI Product of the Day")).toBeInTheDocument();
  });

  it("renders Curated badge", () => {
    render(<AIDailyPick pick={makePick()} />);
    expect(screen.getByText("Curated")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<AIDailyPick pick={makePick()} />);
    expect(screen.getByText("Premium wireless earbuds with noise cancellation.")).toBeInTheDocument();
  });

  it("renders category", () => {
    render(<AIDailyPick pick={makePick()} />);
    expect(screen.getByText("Electronics")).toBeInTheDocument();
  });

  it("renders risk badge", () => {
    render(<AIDailyPick pick={makePick({ risk: "low" })} />);
    expect(screen.getByText("Low Risk")).toBeInTheDocument();
  });

  it("renders medium risk badge", () => {
    render(<AIDailyPick pick={makePick({ risk: "medium" })} />);
    expect(screen.getByText("Medium Risk")).toBeInTheDocument();
  });

  it("renders high risk badge", () => {
    render(<AIDailyPick pick={makePick({ risk: "high" })} />);
    expect(screen.getByText("High Risk")).toBeInTheDocument();
  });

  it("renders platform name", () => {
    render(<AIDailyPick pick={makePick({ platform: "CJ Dropshipping" })} />);
    expect(screen.getAllByText("CJ Dropshipping").length).toBeGreaterThanOrEqual(1);
  });

  it("renders margin percentage", () => {
    render(<AIDailyPick pick={makePick({ margin: 61 })} />);
    expect(screen.getByText("61%")).toBeInTheDocument();
  });

  it("renders orders per month", () => {
    render(<AIDailyPick pick={makePick({ ordersPerMonth: 2500 })} />);
    expect(screen.getByText("2.5K")).toBeInTheDocument();
  });

  it("renders saturation", () => {
    render(<AIDailyPick pick={makePick({ saturation: 35 })} />);
    expect(screen.getByText("35%")).toBeInTheDocument();
  });

  it("renders profit per order", () => {
    render(<AIDailyPick pick={makePick({ earningsPreview: { profitPerOrder: 20, ordersPerMonth: 2500, monthlyRevenue: 50000 } })} />);
    expect(screen.getByText("$20")).toBeInTheDocument();
  });

  it("renders opportunity score", () => {
    render(<AIDailyPick pick={makePick({ overallScore: 87 })} />);
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("renders reason points", () => {
    render(<AIDailyPick pick={makePick({ reasonPoints: ["Point one", "Point two"] })} />);
    expect(screen.getByText("Point one")).toBeInTheDocument();
    expect(screen.getByText("Point two")).toBeInTheDocument();
  });

  it("renders Why AI picked this section", () => {
    render(<AIDailyPick pick={makePick()} />);
    expect(screen.getByText("Why AI picked this")).toBeInTheDocument();
  });

  it("renders Start Selling This button", () => {
    render(<AIDailyPick pick={makePick()} />);
    expect(screen.getByText("Start Selling This")).toBeInTheDocument();
  });

  it("renders Watchlist button", () => {
    render(<AIDailyPick pick={makePick()} />);
    expect(screen.getByText("Watchlist")).toBeInTheDocument();
  });

  it("renders Compare button", () => {
    render(<AIDailyPick pick={makePick()} />);
    expect(screen.getByText("Compare")).toBeInTheDocument();
  });

  it("renders earnings breakdown", () => {
    render(<AIDailyPick pick={makePick()} />);
    expect(screen.getByText("What you would earn")).toBeInTheDocument();
    expect(screen.getByText("Buy at (source)")).toBeInTheDocument();
    expect(screen.getByText("Sell at")).toBeInTheDocument();
    expect(screen.getByText("Profit per order")).toBeInTheDocument();
  });

  it("renders AI Pick badge on image", () => {
    render(<AIDailyPick pick={makePick()} />);
    expect(screen.getByText("AI Pick")).toBeInTheDocument();
  });

  it("renders yesterday pick result", () => {
    render(<AIDailyPick pick={makePick({ yesterdayPick: { title: "Yesterday", result: "+12% profit", up: true } })} />);
    expect(screen.getByText(/Yesterday: \+12% profit/)).toBeInTheDocument();
  });

  it("renders opportunity score description for high score", () => {
    render(<AIDailyPick pick={makePick({ overallScore: 85 })} />);
    expect(screen.getByText(/Excellent opportunity/)).toBeInTheDocument();
  });

  it("renders opportunity score description for medium score", () => {
    render(<AIDailyPick pick={makePick({ overallScore: 65 })} />);
    expect(screen.getByText(/Good opportunity/)).toBeInTheDocument();
  });

  it("renders opportunity score description for low score", () => {
    render(<AIDailyPick pick={makePick({ overallScore: 40 })} />);
    expect(screen.getByText(/Moderate opportunity/)).toBeInTheDocument();
  });
});

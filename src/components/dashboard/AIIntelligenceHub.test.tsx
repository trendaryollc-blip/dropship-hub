import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { AIIntelligenceHub } from "./AIIntelligenceHub";
import type { AIDailyPick, AIBriefing, SmartAlert } from "@/types/dashboard";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props;
    return <img src={src as string} alt={alt as string} {...rest} />;
  },
}));

const briefings: AIBriefing = {
  insights: ["Market trending up"],
  sentiment: 72,
  sentimentLabel: "Bullish",
  opportunities: 5,
  risks: 2,
  trends: 3,
  lastScan: "just now",
};

const dailyPick: AIDailyPick = {
  title: "Wireless Earbuds",
  category: "electronics",
  image: "",
  description: "High-potential product",
  radarScores: null,
  sourcePrice: 10,
  sellPrice: 29.99,
  profit: 19.99,
  margin: 66.6,
  risk: "low",
  reason: "Healthy margin potential",
  platform: "CJ Dropshipping",
  ordersPerMonth: 1200,
  saturation: 40,
  overallScore: 88,
  earningsPreview: { profitPerOrder: 19.99, ordersPerMonth: 1200, monthlyRevenue: 23988 },
  reasonPoints: ["Average rating: 4.5 stars"],
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

const noAlerts: SmartAlert[] = [];

describe("AIIntelligenceHub", () => {
  it("renders the raw last-scan string instead of Invalid Date", () => {
    render(
      <AIIntelligenceHub dailyPick={null} briefing={briefings} alerts={noAlerts} onAlertRead={vi.fn()} onMarkAllRead={vi.fn()} />
    );
    expect(screen.getByText("just now")).toBeInTheDocument();
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
  });

  it("renders a valid date when lastScan is an ISO timestamp", () => {
    const iso = "2026-09-21T12:00:00.000Z";
    render(
      <AIIntelligenceHub
        dailyPick={null}
        briefing={{ ...briefings, lastScan: iso }}
        alerts={noAlerts}
        onAlertRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />
    );
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
  });

  it("links the daily-pick Compare button to the prefilled profit calculator", () => {
    render(
      <AIIntelligenceHub
        dailyPick={dailyPick}
        briefing={briefings}
        alerts={noAlerts}
        onAlertRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />
    );
    const link = screen.getByText("Compare").closest("a");
    expect(link?.getAttribute("href")).toBe(`/calculator/profit?cost=${dailyPick.sourcePrice}&price=${dailyPick.sellPrice}`);
  });

  it("renders the daily-pick expiry without crashing on a malformed date", () => {
    render(
      <AIIntelligenceHub
        dailyPick={{ ...dailyPick, expiresAt: "not-a-date" }}
        briefing={briefings}
        alerts={noAlerts}
        onAlertRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />
    );
    expect(screen.getByText(/not-a-date/)).toBeInTheDocument();
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
  });

  it("renders a human-readable expiry date for a valid ISO timestamp", () => {
    render(
      <AIIntelligenceHub
        dailyPick={{ ...dailyPick, expiresAt: "2026-09-25T12:00:00.000Z" }}
        briefing={briefings}
        alerts={noAlerts}
        onAlertRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />
    );
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
    expect(screen.getByText(/Expires/)).toBeInTheDocument();
  });
});
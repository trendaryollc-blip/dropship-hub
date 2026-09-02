import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IntelligenceHub from "./IntelligenceHub";
import type { SmartAlert } from "@/types/dashboard";

const makeAlert = (overrides: Partial<SmartAlert> = {}): SmartAlert => ({
  id: "1",
  type: "opportunity",
  title: "Price drop detected",
  description: "Product X price dropped 15% on AliExpress.",
  action: "View product",
  actionHref: "/products",
  timestamp: "2m ago",
  read: false,
  confidence: 87,
  aiAnalysis: "Strong opportunity to adjust pricing.",
  sparkline: [10, 20, 30, 40, 50],
  ...overrides,
});

const briefing = {
  insights: ["Market trending up", "New competitor entered"],
  sentiment: 72,
  sentimentLabel: "Bullish",
  opportunities: 5,
  risks: 2,
  trends: 3,
  lastScan: "just now",
};

const pulse = [
  { label: "Trending Products", value: "1,234", change: "+5%", up: true, sparkline: [10, 20, 30], icon: "flame", color: "text-orange-400" },
  { label: "Supplier Activity", value: "98%", change: "+2%", up: true, sparkline: [80, 85, 90], icon: "truck", color: "text-emerald-400" },
];

const actionStats = [
  { label: "Search Products", description: "Discover new items", href: "/products", color: "blue", stat: "42", statLabel: "scanned" },
  { label: "Find Suppliers", description: "Compare suppliers", href: "/suppliers", color: "emerald", stat: "5", statLabel: "online" },
];

describe("IntelligenceHub", () => {
  it("renders AI Market Intelligence heading", () => {
    render(
      <IntelligenceHub alerts={[makeAlert()]} onRead={vi.fn()} onReadAll={vi.fn()} briefing={briefing} pulse={pulse} actionStats={actionStats} />
    );
    expect(screen.getByText("AI Market Intelligence")).toBeInTheDocument();
  });

  it("renders Live Scanning badge", () => {
    render(
      <IntelligenceHub alerts={[makeAlert()]} onRead={vi.fn()} onReadAll={vi.fn()} briefing={briefing} pulse={pulse} actionStats={actionStats} />
    );
    expect(screen.getByText("Live Scanning")).toBeInTheDocument();
  });

  it("renders sentiment value", () => {
    render(
      <IntelligenceHub alerts={[makeAlert()]} onRead={vi.fn()} onReadAll={vi.fn()} briefing={briefing} pulse={pulse} actionStats={actionStats} />
    );
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("Bullish")).toBeInTheDocument();
  });

  it("renders opportunity and risk counts", () => {
    render(
      <IntelligenceHub alerts={[makeAlert()]} onRead={vi.fn()} onReadAll={vi.fn()} briefing={briefing} pulse={pulse} actionStats={actionStats} />
    );
    expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });

  it("renders alert titles in market signals", () => {
    render(
      <IntelligenceHub alerts={[makeAlert({ title: "New trend detected" })]} onRead={vi.fn()} onReadAll={vi.fn()} briefing={briefing} pulse={pulse} actionStats={actionStats} />
    );
    expect(screen.getAllByText("New trend detected").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Live Intelligence Feed", () => {
    render(
      <IntelligenceHub alerts={[makeAlert()]} onRead={vi.fn()} onReadAll={vi.fn()} briefing={briefing} pulse={pulse} actionStats={actionStats} />
    );
    expect(screen.getByText("Live Intelligence Feed")).toBeInTheDocument();
  });

  it("renders Market Pulse section", () => {
    render(
      <IntelligenceHub alerts={[makeAlert()]} onRead={vi.fn()} onReadAll={vi.fn()} briefing={briefing} pulse={pulse} actionStats={actionStats} />
    );
    expect(screen.getByText("Market Pulse")).toBeInTheDocument();
  });

  it("renders Quick Actions section", () => {
    render(
      <IntelligenceHub alerts={[makeAlert()]} onRead={vi.fn()} onReadAll={vi.fn()} briefing={briefing} pulse={pulse} actionStats={actionStats} />
    );
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Search Products")).toBeInTheDocument();
    expect(screen.getByText("Find Suppliers")).toBeInTheDocument();
  });

  it("renders Live Market Signals", () => {
    render(
      <IntelligenceHub alerts={[makeAlert({ title: "Signal 1" })]} onRead={vi.fn()} onReadAll={vi.fn()} briefing={briefing} pulse={pulse} actionStats={actionStats} />
    );
    expect(screen.getByText("Live Market Signals")).toBeInTheDocument();
  });

  it("renders filter tabs", () => {
    render(
      <IntelligenceHub alerts={[makeAlert()]} onRead={vi.fn()} onReadAll={vi.fn()} briefing={briefing} pulse={pulse} actionStats={actionStats} />
    );
    expect(screen.getAllByText("All").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Opps")).toBeInTheDocument();
    expect(screen.getByText("Risks")).toBeInTheDocument();
    expect(screen.getByText("Trends")).toBeInTheDocument();
  });

  it("calls onReadAll when Mark all read clicked", () => {
    const onReadAll = vi.fn();
    render(
      <IntelligenceHub alerts={[makeAlert({ read: false })]} onRead={vi.fn()} onReadAll={onReadAll} briefing={briefing} pulse={pulse} actionStats={actionStats} />
    );
    fireEvent.click(screen.getByText("Mark all read"));
    expect(onReadAll).toHaveBeenCalled();
  });

  it("renders last scan time", () => {
    render(
      <IntelligenceHub alerts={[makeAlert()]} onRead={vi.fn()} onReadAll={vi.fn()} briefing={briefing} pulse={pulse} actionStats={actionStats} />
    );
    expect(screen.getByText(/Last scan: just now/)).toBeInTheDocument();
  });
});

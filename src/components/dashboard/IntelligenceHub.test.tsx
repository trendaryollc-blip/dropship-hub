import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IntelligenceHub, {
  AIMonitoringPanelWrapper,
  MarketPulseGridWrapper,
  QuickActionsStrip,
} from "./IntelligenceHub";
import type { SmartAlert } from "@/types/dashboard";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

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

const renderHub = (overrides: Partial<SmartAlert>[] = []) =>
  render(
    <IntelligenceHub
      alerts={[makeAlert(), ...overrides.map((o) => makeAlert(o))]}
      onRead={vi.fn()}
      onReadAll={vi.fn()}
      briefing={briefing}
      pulse={pulse}
      actionStats={actionStats}
    />
  );

describe("IntelligenceHub", () => {
  it("renders IntelligenceHub with all sections", () => {
    renderHub();
    expect(screen.getByText("AI Market Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Live Intelligence Feed")).toBeInTheDocument();
    expect(screen.getByText("Market Pulse")).toBeInTheDocument();
    expect(screen.getByText("Live Market Signals")).toBeInTheDocument();
  });

  it("renders AIMonitoringPanel with briefing data", () => {
    renderHub();
    expect(screen.getByText("AI Market Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Live Scanning")).toBeInTheDocument();
    expect(screen.getByText(/Last scan: just now/)).toBeInTheDocument();
    expect(screen.getByText("Latest Insight")).toBeInTheDocument();
  });

  it("renders MarketPulseGrid with cards", () => {
    renderHub();
    expect(screen.getByText("Market Pulse")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("98%")).toBeInTheDocument();
  });

  it("renders Live Intelligence Feed", () => {
    renderHub();
    expect(screen.getByText("Live Intelligence Feed")).toBeInTheDocument();
    expect(screen.getAllByText("Price drop detected").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Product X price dropped 15% on AliExpress.").length).toBeGreaterThanOrEqual(1);
  });

  it("shows sentiment gauge", () => {
    renderHub();
    expect(screen.getByText("Market Sentiment")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("Bullish")).toBeInTheDocument();
  });

  it("shows scan stats", () => {
    renderHub();
    expect(screen.getByText("This Scan")).toBeInTheDocument();
    expect(screen.getByText("Products Scanned")).toBeInTheDocument();
    expect(screen.getByText("Opportunities Found")).toBeInTheDocument();
    expect(screen.getByText("Risks Detected")).toBeInTheDocument();
    expect(screen.getByText("Categories Tracked")).toBeInTheDocument();
  });

  it("handles AI analysis expand/collapse on alert cards", () => {
    renderHub();
    const aiBtn = screen.getAllByText("AI Analysis")[0];
    expect(screen.queryByText("Strong opportunity to adjust pricing.")).not.toBeInTheDocument();
    fireEvent.click(aiBtn);
    expect(screen.getByText("Strong opportunity to adjust pricing.")).toBeInTheDocument();
    fireEvent.click(aiBtn);
    expect(screen.queryByText("Strong opportunity to adjust pricing.")).not.toBeInTheDocument();
  });

  it("handles mark all read", () => {
    const onReadAll = vi.fn();
    render(
      <IntelligenceHub
        alerts={[makeAlert({ read: false })]}
        onRead={vi.fn()}
        onReadAll={onReadAll}
        briefing={briefing}
        pulse={pulse}
        actionStats={actionStats}
      />
    );
    fireEvent.click(screen.getByText("Mark all read"));
    expect(onReadAll).toHaveBeenCalledTimes(1);
  });

  it("renders filter tabs (All, Opps, Risks, Trends)", () => {
    renderHub();
    expect(screen.getAllByText("All").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Opps")).toBeInTheDocument();
    expect(screen.getByText("Risks")).toBeInTheDocument();
    expect(screen.getByText("Trends")).toBeInTheDocument();
  });

  it("renders MarketPulseGridWrapper", () => {
    render(<MarketPulseGridWrapper cards={pulse} />);
    expect(screen.getByText("Market Pulse")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("renders AIMonitoringPanelWrapper", () => {
    render(
      <AIMonitoringPanelWrapper briefing={briefing} alerts={[makeAlert()]} />
    );
    expect(screen.getByText("AI Market Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Live Scanning")).toBeInTheDocument();
  });

  it("shows No alerts yet when alerts array is empty", () => {
    render(
      <IntelligenceHub
        alerts={[]}
        onRead={vi.fn()}
        onReadAll={vi.fn()}
        briefing={briefing}
        pulse={pulse}
        actionStats={actionStats}
      />
    );
    expect(screen.getByText("No alerts yet")).toBeInTheDocument();
  });

  it("shows No alerts yet when filter matches no alerts", () => {
    render(
      <IntelligenceHub
        alerts={[makeAlert({ type: "opportunity" })]}
        onRead={vi.fn()}
        onReadAll={vi.fn()}
        briefing={briefing}
        pulse={pulse}
        actionStats={actionStats}
      />
    );
    const risksTab = screen.getByText("Risks");
    fireEvent.click(risksTab);
    expect(screen.getByText("No alerts yet")).toBeInTheDocument();
  });

  it("renders QuickActionsStrip with action cards", () => {
    render(<QuickActionsStrip actions={actionStats} />);
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Search Products")).toBeInTheDocument();
    expect(screen.getByText("Find Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Discover new items")).toBeInTheDocument();
    expect(screen.getByText("Compare suppliers")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("QuickActionsStrip renders links with correct hrefs", () => {
    render(<QuickActionsStrip actions={actionStats} />);
    const links = screen.getAllByRole("link");
    const productLink = links.find((l) => l.getAttribute("href") === "/products");
    const supplierLink = links.find((l) => l.getAttribute("href") === "/suppliers");
    expect(productLink).toBeInTheDocument();
    expect(supplierLink).toBeInTheDocument();
  });

  it("QuickActionsStrip renders stat labels", () => {
    render(<QuickActionsStrip actions={actionStats} />);
    expect(screen.getByText("scanned")).toBeInTheDocument();
    expect(screen.getByText("online")).toBeInTheDocument();
  });

  it("shows Scanning state when lastScan is loading", () => {
    const loadingBriefing = { ...briefing, lastScan: "loading..." };
    render(
      <IntelligenceHub
        alerts={[makeAlert()]}
        onRead={vi.fn()}
        onReadAll={vi.fn()}
        briefing={loadingBriefing}
        pulse={pulse}
        actionStats={actionStats}
      />
    );
    expect(screen.getByText("Scanning...")).toBeInTheDocument();
  });

  it("renders AI Activity Log header", () => {
    renderHub();
    expect(screen.getByText("AI Activity Log")).toBeInTheDocument();
  });

  it("renders filter tab counts", () => {
    renderHub();
    const allTabs = screen.getAllByText("All");
    expect(allTabs.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Opps")).toBeInTheDocument();
    expect(screen.getByText("Risks")).toBeInTheDocument();
    expect(screen.getByText("Trends")).toBeInTheDocument();
  });

  it("renders scan stats values", () => {
    renderHub();
    expect(screen.getByText("550")).toBeInTheDocument();
    expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
  });

  it("shows expand/collapse for activity log", () => {
    renderHub();
    const lessBtn = screen.queryByText("Less");
    expect(lessBtn).not.toBeInTheDocument();
    const allBtn = screen.getAllByText("All").find(
      (el) => el.closest("button")?.className.includes("text-accent")
    );
    fireEvent.click(allBtn!);
    expect(screen.getByText("Less")).toBeInTheDocument();
  });
});

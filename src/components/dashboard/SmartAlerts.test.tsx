import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SmartAlerts from "./SmartAlerts";

describe("SmartAlerts", () => {
  it("renders alerts", () => {
    render(
      <SmartAlerts
        alerts={[
          {
            id: "1",
            type: "opportunity",
            title: "Price Drop Detected",
            description: "Product X dropped 20%",
            action: "View Deal",
            actionHref: "/products/1",
            timestamp: "12m ago",
            read: false,
            confidence: 94,
            aiAnalysis: "Analysis text",
            sparkline: [5, 4, 3, 2, 1],
          },
          {
            id: "2",
            type: "risk",
            title: "Supplier Response Time Increased",
            description: "Supplier Y is running slow",
            action: "Check Suppliers",
            actionHref: "/suppliers",
            timestamp: "1h ago",
            read: true,
            confidence: 87,
            aiAnalysis: "Analysis text",
            sparkline: [4, 5, 6, 7, 8],
          },
        ]}
        onRead={vi.fn()}
        onReadAll={vi.fn()}
      />
    );
    expect(screen.getByText("Price Drop Detected")).toBeInTheDocument();
    expect(screen.getByText("Supplier Response Time Increased")).toBeInTheDocument();
  });

  it("renders empty state when no alerts", () => {
    render(<SmartAlerts alerts={[]} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("Market Intelligence")).toBeInTheDocument();
  });

  it("shows mark all read button when unread alerts exist", () => {
    render(
      <SmartAlerts
        alerts={[
          {
            id: "1",
            type: "info",
            title: "Info Alert",
            description: "Some info",
            action: "View",
            actionHref: "/",
            timestamp: "5m ago",
            read: false,
            confidence: 90,
            aiAnalysis: "Analysis",
            sparkline: [1, 2, 3],
          },
        ]}
        onRead={vi.fn()}
        onReadAll={vi.fn()}
      />
    );
    expect(screen.getByText("Mark all read")).toBeInTheDocument();
  });
});

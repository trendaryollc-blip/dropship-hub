import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SmartAlerts from "./SmartAlerts";

const makeAlert = (overrides: Record<string, any> = {}) => ({
  id: "1",
  type: "opportunity" as const,
  title: "Price Drop Detected",
  description: "Product X dropped 20%",
  action: "View Deal",
  actionHref: "/products/1",
  timestamp: "12m ago",
  read: false,
  confidence: 94,
  aiAnalysis: "Analysis text",
  sparkline: [5, 4, 3, 2, 1],
  ...overrides,
});

describe("SmartAlerts", () => {
  it("renders alerts", () => {
    render(
      <SmartAlerts
        alerts={[
          makeAlert({ id: "1", title: "Price Drop Detected" }),
          makeAlert({ id: "2", type: "risk", title: "Supplier Response Time Increased", read: true }),
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
        alerts={[makeAlert({ read: false })]}
        onRead={vi.fn()}
        onReadAll={vi.fn()}
      />
    );
    expect(screen.getByText("Mark all read")).toBeInTheDocument();
  });

  it("calls onReadAll when mark all read clicked", () => {
    const onReadAll = vi.fn();
    render(
      <SmartAlerts alerts={[makeAlert({ read: false })]} onRead={vi.fn()} onReadAll={onReadAll} />
    );
    fireEvent.click(screen.getByText("Mark all read"));
    expect(onReadAll).toHaveBeenCalledTimes(1);
  });

  it("renders alert descriptions", () => {
    render(
      <SmartAlerts alerts={[makeAlert()]} onRead={vi.fn()} onReadAll={vi.fn()} />
    );
    expect(screen.getByText("Product X dropped 20%")).toBeInTheDocument();
  });

  it("renders alert timestamps", () => {
    render(
      <SmartAlerts alerts={[makeAlert({ timestamp: "12m ago" })]} onRead={vi.fn()} onReadAll={vi.fn()} />
    );
    expect(screen.getByText("12m ago")).toBeInTheDocument();
  });

  it("renders alert confidence", () => {
    render(
      <SmartAlerts alerts={[makeAlert({ confidence: 94 })]} onRead={vi.fn()} onReadAll={vi.fn()} />
    );
    expect(screen.getByText("Price Drop Detected")).toBeInTheDocument();
  });

  it("renders action links", () => {
    render(
      <SmartAlerts alerts={[makeAlert({ action: "View Deal", actionHref: "/products/1" })]} onRead={vi.fn()} onReadAll={vi.fn()} />
    );
    const link = screen.getByText("View Deal").closest("a");
    expect(link).toHaveAttribute("href", "/products/1");
  });

  it("calls onRead when action link clicked", () => {
    const onRead = vi.fn();
    render(
      <SmartAlerts alerts={[makeAlert({ id: "alert-1" })]} onRead={onRead} onReadAll={vi.fn()} />
    );
    fireEvent.click(screen.getByText("View Deal"));
    expect(onRead).toHaveBeenCalledWith("alert-1");
  });

  it("does not show mark all read when all alerts are read", () => {
    render(
      <SmartAlerts alerts={[makeAlert({ read: true })]} onRead={vi.fn()} onReadAll={vi.fn()} />
    );
    expect(screen.queryByText("Mark all read")).toBeNull();
  });

  it("renders different alert types", () => {
    render(
      <SmartAlerts
        alerts={[
          makeAlert({ id: "1", type: "opportunity", title: "Opp Alert" }),
          makeAlert({ id: "2", type: "risk", title: "Risk Alert" }),
          makeAlert({ id: "3", type: "info", title: "Info Alert" }),
          makeAlert({ id: "4", type: "warning", title: "Warning Alert" }),
        ]}
        onRead={vi.fn()}
        onReadAll={vi.fn()}
      />
    );
    expect(screen.getByText("Opp Alert")).toBeInTheDocument();
    expect(screen.getByText("Risk Alert")).toBeInTheDocument();
    expect(screen.getByText("Info Alert")).toBeInTheDocument();
    expect(screen.getByText("Warning Alert")).toBeInTheDocument();
  });

  it("renders read alerts with different styling", () => {
    render(
      <SmartAlerts
        alerts={[makeAlert({ id: "1", read: false }), makeAlert({ id: "2", read: true, title: "Read Alert" })]}
        onRead={vi.fn()}
        onReadAll={vi.fn()}
      />
    );
    expect(screen.getByText("Price Drop Detected")).toBeInTheDocument();
    expect(screen.getByText("Read Alert")).toBeInTheDocument();
  });

  it("renders empty state heading", () => {
    render(<SmartAlerts alerts={[]} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByText("Market Intelligence")).toBeInTheDocument();
  });

  it("renders View All Alerts link", () => {
    render(
      <SmartAlerts alerts={[makeAlert({ action: "View All", actionHref: "/monitoring" })]} onRead={vi.fn()} onReadAll={vi.fn()} />
    );
    const link = screen.getByText("View All").closest("a");
    expect(link).toHaveAttribute("href", "/monitoring");
  });

  it("renders sparkline SVG", () => {
    render(
      <SmartAlerts alerts={[makeAlert({ sparkline: [1, 2, 3, 4, 5] })]} onRead={vi.fn()} onReadAll={vi.fn()} />
    );
    expect(screen.getByText("Price Drop Detected")).toBeInTheDocument();
  });

  it("renders unread indicator dot", () => {
    render(
      <SmartAlerts alerts={[makeAlert({ read: false })]} onRead={vi.fn()} onReadAll={vi.fn()} />
    );
    expect(screen.getByText("Price Drop Detected")).toBeInTheDocument();
  });

  it("hides unread indicator for read alerts", () => {
    render(
      <SmartAlerts alerts={[makeAlert({ read: true })]} onRead={vi.fn()} onReadAll={vi.fn()} />
    );
    expect(screen.getByText("Price Drop Detected")).toBeInTheDocument();
  });

  it("renders multiple alerts with correct count", () => {
    render(
      <SmartAlerts
        alerts={[
          makeAlert({ id: "1", title: "Alert 1" }),
          makeAlert({ id: "2", title: "Alert 2" }),
          makeAlert({ id: "3", title: "Alert 3" }),
        ]}
        onRead={vi.fn()}
        onReadAll={vi.fn()}
      />
    );
    expect(screen.getByText("Alert 1")).toBeInTheDocument();
    expect(screen.getByText("Alert 2")).toBeInTheDocument();
    expect(screen.getByText("Alert 3")).toBeInTheDocument();
  });
});

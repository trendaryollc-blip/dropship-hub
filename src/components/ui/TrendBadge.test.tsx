import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TrendBadge from "./TrendBadge";

describe("TrendBadge", () => {
  it("renders positive trend with + prefix", () => {
    render(<TrendBadge value={12.5} />);
    expect(screen.getByText("+12.5%")).toBeInTheDocument();
  });

  it("renders negative trend", () => {
    render(<TrendBadge value={-5.3} />);
    expect(screen.getByText("-5.3%")).toBeInTheDocument();
  });

  it("renders neutral trend", () => {
    render(<TrendBadge value={0} />);
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });

  it("supports custom suffix", () => {
    render(<TrendBadge value={8.2} suffix=" pts" />);
    expect(screen.getByText("+8.2 pts")).toBeInTheDocument();
  });

  it("applies trend-up color class for positive values", () => {
    const { container } = render(<TrendBadge value={5} />);
    const badge = container.firstElementChild;
    expect(badge).toHaveClass("text-[var(--color-trend-up)]");
  });

  it("applies trend-down color class for negative values", () => {
    const { container } = render(<TrendBadge value={-5} />);
    const badge = container.firstElementChild;
    expect(badge).toHaveClass("text-[var(--color-trend-down)]");
  });

  it("hides icon when showIcon is false", () => {
    const { container } = render(<TrendBadge value={5} showIcon={false} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<TrendBadge value={5} className="my-badge" />);
    const span = container.firstElementChild;
    expect(span).toHaveClass("my-badge");
  });
});

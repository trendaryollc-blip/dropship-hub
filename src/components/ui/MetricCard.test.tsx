import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DollarSign } from "lucide-react";
import MetricCard from "./MetricCard";

describe("MetricCard", () => {
  const baseProps = {
    icon: DollarSign,
    label: "Revenue",
    value: 12500,
  };

  it("renders the label", () => {
    render(<MetricCard {...baseProps} />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
  });

  it("renders the value with prefix", () => {
    render(<MetricCard {...baseProps} prefix="$" />);
    expect(screen.getByText(/\$/)).toBeInTheDocument();
  });

  it("renders the value", () => {
    render(<MetricCard {...baseProps} />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
  });

  it("applies correct color class", () => {
    const { container } = render(<MetricCard {...baseProps} color="emerald" />);
    const iconWrapper = container.querySelector(".bg-emerald-400\\/10");
    expect(iconWrapper).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<MetricCard {...baseProps} className="my-card" />);
    const card = container.firstElementChild;
    expect(card).toHaveClass("my-card");
  });

  it("applies transition delay", () => {
    const { container } = render(<MetricCard {...baseProps} delay={200} />);
    const card = container.firstElementChild;
    expect(card).toHaveStyle({ transitionDelay: "200ms" });
  });
});

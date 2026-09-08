import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SemiCircleGauge from "./SemiCircleGauge";

describe("SemiCircleGauge", () => {
  it("renders an SVG element", () => {
    const { container } = render(<SemiCircleGauge value={50} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("displays percentage label by default", () => {
    render(<SemiCircleGauge value={75} />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("accepts custom label", () => {
    render(<SemiCircleGauge value={90} label="High" />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("hides label when showLabel is false", () => {
    const { container } = render(<SemiCircleGauge value={50} showLabel={false} />);
    const text = container.querySelector(".font-mono");
    expect(text).not.toBeInTheDocument();
  });

  it("applies custom dimensions", () => {
    const { container } = render(<SemiCircleGauge value={50} width={150} height={80} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "150");
    expect(svg).toHaveAttribute("height", "80");
  });

  it("applies custom className", () => {
    const { container } = render(<SemiCircleGauge value={50} className="my-gauge" />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("my-gauge");
  });
});

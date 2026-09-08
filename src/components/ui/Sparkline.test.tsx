import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Sparkline from "./Sparkline";

describe("Sparkline", () => {
  it("renders an SVG element", () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4, 5]} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("returns null for empty data", () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("applies custom width and height", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} width={120} height={40} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "120");
    expect(svg).toHaveAttribute("height", "40");
  });

  it("renders gradient when gradient prop is true", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} gradient={true} />);
    const defs = container.querySelector("defs");
    expect(defs).toBeInTheDocument();
  });

  it("does not render gradient fill when gradient is false", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} gradient={false} />);
    const gradientFill = container.querySelector("path[fill*='url']");
    expect(gradientFill).not.toBeInTheDocument();
  });

  it("applies custom color", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} color="#ff0000" />);
    const path = container.querySelector("path[stroke]");
    expect(path).toHaveAttribute("stroke", "#ff0000");
  });

  it("uses trend colors when positive is provided", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} positive={true} />);
    const path = container.querySelector("path[stroke]");
    expect(path).toHaveAttribute("stroke", "var(--color-trend-up)");
  });

  it("applies custom className", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} className="my-class" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("my-class");
  });
});

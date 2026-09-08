import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreRing from "./ScoreRing";

describe("ScoreRing", () => {
  it("renders an SVG element", () => {
    const { container } = render(<ScoreRing value={50} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("displays the value label by default", () => {
    render(<ScoreRing value={75} />);
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("accepts custom label text", () => {
    render(<ScoreRing value={90} label="A+" />);
    expect(screen.getByText("A+")).toBeInTheDocument();
  });

  it("hides label when showLabel is false", () => {
    const { container } = render(<ScoreRing value={50} showLabel={false} />);
    const text = container.querySelector(".font-mono");
    expect(text).not.toBeInTheDocument();
  });

  it("applies custom size", () => {
    const { container } = render(<ScoreRing value={50} size={80} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "80");
    expect(svg).toHaveAttribute("height", "80");
  });

  it("applies custom className", () => {
    const { container } = render(<ScoreRing value={50} className="my-ring" />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("my-ring");
  });
});

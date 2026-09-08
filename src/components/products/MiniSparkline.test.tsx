import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MiniSparkline from "./MiniSparkline";

describe("MiniSparkline", () => {
  it("renders an SVG sparkline with valid points", () => {
    render(<MiniSparkline points={[10, 20, 15, 30]} id="test" />);
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "100%");
    expect(svg).toHaveAttribute("height", "32");
  });

  it("renders gradient definition with custom color", () => {
    render(<MiniSparkline points={[1, 2, 3]} color="#ff0000" id="spark" />);
    const stop = document.querySelector("stop");
    expect(stop).toHaveAttribute("stop-color", "#ff0000");
  });

  it("handles equal min/max points (flat line)", () => {
    render(<MiniSparkline points={[5, 5, 5]} id="flat" />);
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders path elements for area and line", () => {
    render(<MiniSparkline points={[10, 20, 30]} id="paths" />);
    const paths = document.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it("renders with custom dimensions", () => {
    render(<MiniSparkline points={[1, 2, 3]} id="custom" width={200} height={50} />);
    const svg = document.querySelector("svg");
    expect(svg).toHaveAttribute("height", "50");
  });
});

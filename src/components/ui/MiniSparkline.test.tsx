import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MiniSparkline from "./MiniSparkline";

describe("MiniSparkline", () => {
  it("renders SVG with data", () => {
    const { container } = render(<MiniSparkline data={[1, 2, 3, 4, 5]} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("returns null for less than 2 points", () => {
    const { container } = render(<MiniSparkline data={[1]} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null for empty data", () => {
    const { container } = render(<MiniSparkline data={[]} />);
    expect(container.innerHTML).toBe("");
  });
});

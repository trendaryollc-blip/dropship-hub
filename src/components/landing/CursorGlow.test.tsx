import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import CursorGlow from "./CursorGlow";

describe("CursorGlow", () => {
  it("renders without crashing", () => {
    const { container } = render(<CursorGlow />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("has pointer-events-none", () => {
    const { container } = render(<CursorGlow />);
    const glow = container.firstChild as HTMLElement;
    expect(glow.className).toContain("pointer-events-none");
  });

  it("has fixed positioning", () => {
    const { container } = render(<CursorGlow />);
    const glow = container.firstChild as HTMLElement;
    expect(glow.className).toContain("fixed");
  });
});

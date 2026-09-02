import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreRing from "./ScoreRing";

describe("ScoreRing", () => {
  it("renders score value", () => {
    render(<ScoreRing score={85} />);
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("renders with custom size", () => {
    const { container } = render(<ScoreRing score={50} size={60} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders low score", () => {
    render(<ScoreRing score={30} />);
    expect(screen.getByText("30")).toBeInTheDocument();
  });
});

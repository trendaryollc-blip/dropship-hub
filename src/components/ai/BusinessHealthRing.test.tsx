import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BusinessHealthRing from "./BusinessHealthRing";

describe("BusinessHealthRing", () => {
  it("renders score value", () => {
    render(<BusinessHealthRing score={75} />);
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("renders /100 label", () => {
    render(<BusinessHealthRing score={50} />);
    expect(screen.getByText("/100")).toBeInTheDocument();
  });

  it("shows Excellent label for score >= 80", () => {
    render(<BusinessHealthRing score={85} />);
    expect(screen.getByText("Excellent")).toBeInTheDocument();
  });

  it("shows Good label for score >= 60", () => {
    render(<BusinessHealthRing score={65} />);
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("shows Needs Work label for score >= 40", () => {
    render(<BusinessHealthRing score={45} />);
    expect(screen.getByText("Needs Work")).toBeInTheDocument();
  });

  it("shows Critical label for score < 40", () => {
    render(<BusinessHealthRing score={20} />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("hides label when showLabel is false", () => {
    render(<BusinessHealthRing score={75} showLabel={false} />);
    expect(screen.queryByText("Good")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<BusinessHealthRing score={50} className="custom-class" />);
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("renders SVG ring", () => {
    render(<BusinessHealthRing score={60} />);
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("renders two circles (background and score)", () => {
    render(<BusinessHealthRing score={60} />);
    const circles = document.querySelectorAll("circle");
    expect(circles.length).toBe(2);
  });
});

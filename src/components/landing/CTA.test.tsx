import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CTA from "./CTA";

vi.mock("next/link", () => ({
  default: (props: any) => <a {...props}>{props.children}</a>,
}));

describe("CTA", () => {
  it("renders heading", () => {
    render(<CTA />);
    expect(screen.getByText(/Your Next Winning Product/)).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<CTA />);
    expect(screen.getByText(/AI picks your winners/)).toBeInTheDocument();
  });

  it("renders feature pills", () => {
    render(<CTA />);
    expect(screen.getByText("AI Daily Pick")).toBeInTheDocument();
    expect(screen.getByText("Niche Radar")).toBeInTheDocument();
    expect(screen.getByText("Live Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Trending Scores")).toBeInTheDocument();
  });

  it("renders CTA button", () => {
    render(<CTA />);
    expect(screen.getByText("Get Started Free")).toBeInTheDocument();
  });

  it("renders no credit card text", () => {
    render(<CTA />);
    expect(screen.getByText(/No credit card required/)).toBeInTheDocument();
  });
});

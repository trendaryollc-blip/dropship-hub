import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HowItWorks from "./HowItWorks";

vi.mock("next/link", () => ({
  default: (props: any) => <a {...props}>{props.children}</a>,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

describe("HowItWorks", () => {
  it("renders heading", () => {
    render(<HowItWorks />);
    expect(screen.getByText(/From Discovery to/)).toBeInTheDocument();
  });

  it("renders section label", () => {
    render(<HowItWorks />);
    expect(screen.getByText("How It Works")).toBeInTheDocument();
  });

  it("renders all three steps", () => {
    render(<HowItWorks />);
    expect(screen.getByText("AI Discovers Winners")).toBeInTheDocument();
    expect(screen.getByText("Analyze & Compare")).toBeInTheDocument();
    expect(screen.getByText("Launch & Earn XP")).toBeInTheDocument();
  });

  it("renders step descriptions", () => {
    render(<HowItWorks />);
    expect(screen.getByText(/AI scans 10\+ platforms daily/)).toBeInTheDocument();
    expect(screen.getByText(/niche radar scores/)).toBeInTheDocument();
    expect(screen.getByText(/Push winning products/)).toBeInTheDocument();
  });

  it("renders step numbers", () => {
    render(<HowItWorks />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });
});

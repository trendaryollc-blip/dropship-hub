import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Comparison from "./Comparison";

vi.mock("next/link", () => ({
  default: (props: any) => <a {...props}>{props.children}</a>,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

describe("Comparison", () => {
  it("renders heading", () => {
    render(<Comparison />);
    expect(screen.getByText(/One Tool/)).toBeInTheDocument();
  });

  it("renders section label", () => {
    render(<Comparison />);
    expect(screen.getByText("Why DropShip Hub")).toBeInTheDocument();
  });

  it("renders slider instruction", () => {
    render(<Comparison />);
    expect(screen.getByText(/Drag the slider/)).toBeInTheDocument();
  });

  it("renders DropShip Hub label", () => {
    render(<Comparison />);
    expect(screen.getAllByText("DropShip Hub").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Manual label", () => {
    render(<Comparison />);
    expect(screen.getAllByText("Manual").length).toBeGreaterThanOrEqual(1);
  });

  it("renders comparison rows", () => {
    render(<Comparison />);
    expect(screen.getByText("AI daily product pick")).toBeInTheDocument();
    expect(screen.getByText("Live market monitoring")).toBeInTheDocument();
  });

  it("renders time comparison", () => {
    render(<Comparison />);
    expect(screen.getByText("15 min/day")).toBeInTheDocument();
    expect(screen.getByText("4+ hours/day")).toBeInTheDocument();
  });

  it("renders cost comparison", () => {
    render(<Comparison />);
    expect(screen.getByText("Free to start")).toBeInTheDocument();
    expect(screen.getByText("$200+/mo in tools")).toBeInTheDocument();
  });
});

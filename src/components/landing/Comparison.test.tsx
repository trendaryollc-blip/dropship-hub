import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("Daily product pick")).toBeInTheDocument();
    expect(screen.getByText("Market data monitoring")).toBeInTheDocument();
  });

  it("renders time comparison", () => {
    render(<Comparison />);
    expect(screen.getByText("Minutes a day")).toBeInTheDocument();
    expect(screen.getByText("Hours of manual work")).toBeInTheDocument();
  });

  it("renders cost comparison", () => {
    render(<Comparison />);
    expect(screen.getByText("Free to start")).toBeInTheDocument();
    expect(screen.getByText("Separate paid tools")).toBeInTheDocument();
  });

  it("exposes status icons to screen readers", () => {
    render(<Comparison />);
    expect(screen.getAllByText("Included").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not included").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Partial").length).toBeGreaterThan(0);
  });

  it("has a focusable slider handle", () => {
    render(<Comparison />);
    const slider = screen.getByRole("slider", { name: /before and after/i });
    expect(slider).toHaveAttribute("aria-valuemin", "10");
    expect(slider).toHaveAttribute("aria-valuemax", "90");
    expect(slider.tabIndex).toBe(0);
  });
});

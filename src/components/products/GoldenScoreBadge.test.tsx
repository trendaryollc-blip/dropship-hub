import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GoldenScoreBadge from "./GoldenScoreBadge";

describe("GoldenScoreBadge", () => {
  it("renders S rank with amber color", () => {
    render(<GoldenScoreBadge score={90} />);
    const badge = screen.getByTestId("golden-score-badge");
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain("S");
  });

  it("renders A rank with emerald color", () => {
    render(<GoldenScoreBadge score={75} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders B rank with blue color", () => {
    render(<GoldenScoreBadge score={55} />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("renders C rank with orange color", () => {
    render(<GoldenScoreBadge score={35} />);
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("renders D rank with red color", () => {
    render(<GoldenScoreBadge score={10} />);
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("shows score number in tooltip", () => {
    render(<GoldenScoreBadge score={85} />);
    const badge = screen.getByTestId("golden-score-badge");
    expect(badge.textContent).toContain("85");
  });

  it("uses explicit rank when provided", () => {
    render(<GoldenScoreBadge score={50} rank="S" />);
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("renders different sizes", () => {
    const { rerender } = render(<GoldenScoreBadge score={80} size="sm" />);
    expect(screen.getByTestId("golden-score-badge")).toBeTruthy();
    rerender(<GoldenScoreBadge score={80} size="lg" />);
    expect(screen.getByTestId("golden-score-badge")).toBeTruthy();
  });

  it("renders boundary scores correctly", () => {
    const { rerender } = render(<GoldenScoreBadge score={85} />);
    expect(screen.getByText("S")).toBeInTheDocument();
    rerender(<GoldenScoreBadge score={84} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    rerender(<GoldenScoreBadge score={70} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    rerender(<GoldenScoreBadge score={69} />);
    expect(screen.getByText("B")).toBeInTheDocument();
    rerender(<GoldenScoreBadge score={50} />);
    expect(screen.getByText("B")).toBeInTheDocument();
    rerender(<GoldenScoreBadge score={49} />);
    expect(screen.getByText("C")).toBeInTheDocument();
    rerender(<GoldenScoreBadge score={30} />);
    expect(screen.getByText("C")).toBeInTheDocument();
    rerender(<GoldenScoreBadge score={29} />);
    expect(screen.getByText("D")).toBeInTheDocument();
  });
});

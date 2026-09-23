import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ResultsHeader from "./ResultsHeader";

const baseProps = {
  resultCount: 42,
  platformCount: 5,
  sortBy: "relevance" as const,
  setSortBy: vi.fn(),
  viewMode: "grid" as const,
  setViewMode: vi.fn(),
};

describe("ResultsHeader", () => {
  it("renders results count", () => {
    render(<ResultsHeader {...baseProps} />);
    expect(screen.getByText("42 products found")).toBeInTheDocument();
  });

  it("renders platform count", () => {
    render(<ResultsHeader {...baseProps} />);
    expect(screen.getByText("5 platforms searched")).toBeInTheDocument();
  });

  it("renders all sort options", () => {
    render(<ResultsHeader {...baseProps} />);
    expect(screen.getByText("Relevance")).toBeInTheDocument();
    expect(screen.getByText("Price: Low to High")).toBeInTheDocument();
    expect(screen.getByText("Price: High to Low")).toBeInTheDocument();
    expect(screen.getByText("Top Rated")).toBeInTheDocument();
    expect(screen.getByText("Most Reviews")).toBeInTheDocument();
    expect(screen.getByText("Highest Margin")).toBeInTheDocument();
    expect(screen.getByText("Golden Score")).toBeInTheDocument();
  });

  it("calls setSortBy when the select changes", () => {
    const setSortBy = vi.fn();
    render(<ResultsHeader {...baseProps} setSortBy={setSortBy} />);

    fireEvent.change(screen.getByLabelText("Sort results"), {
      target: { value: "price-asc" },
    });

    expect(setSortBy).toHaveBeenCalledWith("price-asc");
  });

  it("marks the active grid view button as pressed", () => {
    render(<ResultsHeader {...baseProps} viewMode="grid" />);
    expect(screen.getByLabelText("Grid view")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("List view")).toHaveAttribute("aria-pressed", "false");
  });

  it("switches to list view", () => {
    const setViewMode = vi.fn();
    render(<ResultsHeader {...baseProps} setViewMode={setViewMode} />);
    fireEvent.click(screen.getByLabelText("List view"));
    expect(setViewMode).toHaveBeenCalledWith("list");
  });

  it("switches back to grid view", () => {
    const setViewMode = vi.fn();
    render(<ResultsHeader {...baseProps} viewMode="list" setViewMode={setViewMode} />);
    fireEvent.click(screen.getByLabelText("Grid view"));
    expect(setViewMode).toHaveBeenCalledWith("grid");
  });
});
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ResultsHeader from "./ResultsHeader";

describe("ResultsHeader", () => {
  it("renders results count", () => {
    render(
      <ResultsHeader
        resultCount={42}
        platformCount={5}
        sortBy="relevance"
        setSortBy={vi.fn()}
        viewMode="grid"
        setViewMode={vi.fn()}
      />
    );
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it("renders platform count", () => {
    render(
      <ResultsHeader
        resultCount={10}
        platformCount={3}
        sortBy="relevance"
        setSortBy={vi.fn()}
        viewMode="grid"
        setViewMode={vi.fn()}
      />
    );
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it("renders sort options", () => {
    render(
      <ResultsHeader
        resultCount={0}
        platformCount={0}
        sortBy="relevance"
        setSortBy={vi.fn()}
        viewMode="grid"
        setViewMode={vi.fn()}
      />
    );
    expect(screen.getByText("Relevance")).toBeInTheDocument();
    expect(screen.getByText("Price: Low to High")).toBeInTheDocument();
  });
});

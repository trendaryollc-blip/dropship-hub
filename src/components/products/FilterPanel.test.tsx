import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FilterPanel from "./FilterPanel";
import type { Filters } from "./FilterPanel";

const defaultFilters: Filters = { brands: [], priceMin: "", priceMax: "", minRating: 0, minMargin: 0, competitionLevel: [], trendingDirection: [], platformFilter: [] };
const defaultProps = {
  filters: defaultFilters,
  setFilters: vi.fn(),
  availableBrands: ["Nike", "Adidas", "Puma"],
  resultCount: 100,
  filteredCount: 100,
};

describe("FilterPanel", () => {
  it("renders Filters heading", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("renders brand list", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText("Adidas")).toBeInTheDocument();
    expect(screen.getByText("Nike")).toBeInTheDocument();
    expect(screen.getByText("Puma")).toBeInTheDocument();
  });

  it("renders brand search input", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search brands...")).toBeInTheDocument();
  });

  it("filters brands by search", () => {
    render(<FilterPanel {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("Search brands..."), { target: { value: "Ni" } });
    expect(screen.getByText("Nike")).toBeInTheDocument();
    expect(screen.queryByText("Adidas")).not.toBeInTheDocument();
  });

  it("calls setFilters when brand is toggled", () => {
    const setFilters = vi.fn();
    render(<FilterPanel {...defaultProps} setFilters={setFilters} />);
    fireEvent.click(screen.getByText("Nike"));
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ brands: ["Nike"] })
    );
  });

  it("shows Clear all when filters are active", () => {
    const filtersWithBrands = { ...defaultFilters, brands: ["Nike"] };
    render(<FilterPanel {...defaultProps} filters={filtersWithBrands} />);
    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });

  it("hides Clear all when no filters active", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.queryByText("Clear all")).not.toBeInTheDocument();
  });

  it("renders price range inputs", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText("Min")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Max")).toBeInTheDocument();
  });

  it("renders rating buttons", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText("Any")).toBeInTheDocument();
    expect(screen.getByText("1+")).toBeInTheDocument();
    expect(screen.getByText("5+")).toBeInTheDocument();
  });

  it("shows hidden count when filters are active", () => {
    const activeFilters = { ...defaultFilters, brands: ["Nike"] };
    render(<FilterPanel {...defaultProps} filters={activeFilters} filteredCount={80} />);
    expect(screen.getByText("20 hidden")).toBeInTheDocument();
  });

  it("shows no brands message when no brands available", () => {
    render(<FilterPanel {...defaultProps} availableBrands={[]} />);
    expect(screen.getByText("No brand data available for these results")).toBeInTheDocument();
  });

  it("shows active filter chips", () => {
    const activeFilters = { ...defaultFilters, brands: ["Nike"], priceMin: "10", priceMax: "50", minRating: 3 };
    render(<FilterPanel {...defaultProps} filters={activeFilters} />);
    expect(screen.getByText("Min $10")).toBeInTheDocument();
    expect(screen.getByText("Max $50")).toBeInTheDocument();
    expect(screen.getByText("3+ stars")).toBeInTheDocument();
  });
});

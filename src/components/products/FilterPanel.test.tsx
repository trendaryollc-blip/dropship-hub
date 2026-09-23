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

  it("shows a message when brand search has no matches", () => {
    render(<FilterPanel {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("Search brands..."), { target: { value: "Zzz" } });
    expect(screen.getByText(/No brands match/)).toBeInTheDocument();
  });

  it("calls setFilters when brand is toggled", () => {
    const setFilters = vi.fn();
    render(<FilterPanel {...defaultProps} setFilters={setFilters} />);
    fireEvent.click(screen.getByText("Nike"));
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ brands: ["Nike"] })
    );
  });

  it("removes a brand when toggled again", () => {
    const setFilters = vi.fn();
    render(<FilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, brands: ["Nike"] }} />);
    fireEvent.click(screen.getAllByText("Nike")[0]);
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ brands: [] })
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

  it("clamps priceMin to priceMax when it crosses", () => {
    const setFilters = vi.fn();
    render(<FilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, priceMax: "50" }} />);
    fireEvent.change(screen.getByLabelText("Minimum price"), { target: { value: "80" } });
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ priceMin: "80", priceMax: "80" })
    );
  });

  it("clamps priceMax to priceMin when it crosses", () => {
    const setFilters = vi.fn();
    render(<FilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, priceMin: "10" }} />);
    fireEvent.change(screen.getByLabelText("Maximum price"), { target: { value: "5" } });
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ priceMin: "5", priceMax: "5" })
    );
  });

  it("sets priceMin without clamping when within range", () => {
    const setFilters = vi.fn();
    render(<FilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, priceMax: "50" }} />);
    fireEvent.change(screen.getByLabelText("Minimum price"), { target: { value: "10" } });
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ priceMin: "10", priceMax: "50" })
    );
  });

  it("renders rating buttons", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getAllByText("Any").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1+")).toBeInTheDocument();
    expect(screen.getByText("5+")).toBeInTheDocument();
  });

  it("sets minRating from a rating button", () => {
    const setFilters = vi.fn();
    render(<FilterPanel {...defaultProps} setFilters={setFilters} />);
    fireEvent.click(screen.getByText("4+"));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ minRating: 4 }));
  });

  it("sets minMargin from a preset button", () => {
    const setFilters = vi.fn();
    render(<FilterPanel {...defaultProps} setFilters={setFilters} />);
    fireEvent.click(screen.getByText("30%+"));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ minMargin: 30 }));
  });

  it("toggles competition level", () => {
    const setFilters = vi.fn();
    render(<FilterPanel {...defaultProps} setFilters={setFilters} />);
    fireEvent.click(screen.getByText("High"));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ competitionLevel: ["high"] }));
  });

  it("removes a competition level when toggled again", () => {
    const setFilters = vi.fn();
    render(
      <FilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, competitionLevel: ["medium"] }} />
    );
    fireEvent.click(screen.getByText("Medium"));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ competitionLevel: [] }));
  });

  it("toggles trending direction", () => {
    const setFilters = vi.fn();
    render(<FilterPanel {...defaultProps} setFilters={setFilters} />);
    fireEvent.click(screen.getByText("Declining"));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ trendingDirection: ["declining"] }));
  });

  it("toggles a platform filter", () => {
    const setFilters = vi.fn();
    render(<FilterPanel {...defaultProps} setFilters={setFilters} availablePlatforms={["amazon", "ebay"]} />);
    fireEvent.click(screen.getByText("amazon"));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ platformFilter: ["amazon"] }));
  });

  it("clears all filters", () => {
    const setFilters = vi.fn();
    const active = {
      ...defaultFilters,
      brands: ["Nike"],
      priceMin: "10",
      minMargin: 30,
      competitionLevel: ["high" as const],
      trendingDirection: ["rising" as const],
      platformFilter: ["amazon"],
    };
    render(<FilterPanel {...defaultProps} setFilters={setFilters} filters={active} />);
    fireEvent.click(screen.getByText("Clear all"));
    expect(setFilters).toHaveBeenCalledWith(defaultFilters);
  });

  it("removes a filter via its active chip", () => {
    const setFilters = vi.fn();
    render(<FilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, minMargin: 30 }} />);
    fireEvent.click(screen.getByText("30%+ margin"));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ minMargin: 0 }));
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
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SearchHeader from "./SearchHeader";

describe("SearchHeader", () => {
  it("renders search input", () => {
    render(
      <SearchHeader
        query=""
        setQuery={vi.fn()}
        onSearch={vi.fn()}
        loading={false}
        platforms={[{ id: "amazon", name: "Amazon" }]}
        selectedPlatforms={[]}
        togglePlatform={vi.fn()}
        showFilters={false}
        setShowFilters={vi.fn()}
        recentSearches={[]}
        onRecentClick={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("renders heading", () => {
    render(
      <SearchHeader
        query=""
        setQuery={vi.fn()}
        onSearch={vi.fn()}
        loading={false}
        platforms={[]}
        selectedPlatforms={[]}
        togglePlatform={vi.fn()}
        showFilters={false}
        setShowFilters={vi.fn()}
        recentSearches={[]}
        onRecentClick={vi.fn()}
      />
    );
    expect(screen.getByText("Product Search")).toBeInTheDocument();
  });

  it("renders platform buttons", () => {
    render(
      <SearchHeader
        query=""
        setQuery={vi.fn()}
        onSearch={vi.fn()}
        loading={false}
        platforms={[{ id: "amazon", name: "Amazon" }, { id: "ebay", name: "eBay" }]}
        selectedPlatforms={[]}
        togglePlatform={vi.fn()}
        showFilters={false}
        setShowFilters={vi.fn()}
        recentSearches={[]}
        onRecentClick={vi.fn()}
      />
    );
    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText("Ebay")).toBeInTheDocument();
  });

  it("renders search button", () => {
    render(
      <SearchHeader
        query=""
        setQuery={vi.fn()}
        onSearch={vi.fn()}
        loading={false}
        platforms={[]}
        selectedPlatforms={[]}
        togglePlatform={vi.fn()}
        showFilters={false}
        setShowFilters={vi.fn()}
        recentSearches={[]}
        onRecentClick={vi.fn()}
      />
    );
    expect(screen.getByText("Search All")).toBeInTheDocument();
  });
});

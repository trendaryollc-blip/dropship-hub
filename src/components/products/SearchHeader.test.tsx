import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SearchHeader from "./SearchHeader";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("SearchHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ suggestions: [] }),
    });
  });

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

  it("renders platform chips", () => {
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
    expect(screen.getByText("Search All Platforms")).toBeInTheDocument();
  });

  it("fetches dynamic suggestions from API when query changes", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          { text: "wireless earbuds", category: "trending" },
          { text: "wireless charger", category: "category", categoryLabel: "electronics" },
        ],
      }),
    });

    const { rerender } = render(
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

    // Re-render with new query to trigger the useEffect
    rerender(
      <SearchHeader
        query="wireless"
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

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it("does not show hardcoded TRENDING_SUGGESTIONS", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ suggestions: [] }),
    });

    render(
      <SearchHeader
        query="wireless"
        setQuery={vi.fn()}
        onSearch={vi.fn()}
        loading={false}
        platforms={[]}
        selectedPlatforms={[]}
        togglePlatform={vi.fn()}
        showFilters={true}
        setShowFilters={vi.fn()}
        recentSearches={[]}
        onRecentClick={vi.fn()}
      />
    );

    // The old hardcoded suggestions should NOT appear
    expect(screen.queryByText("yoga mat")).not.toBeInTheDocument();
    expect(screen.queryByText("car phone mount")).not.toBeInTheDocument();
    expect(screen.queryByText("laptop stand")).not.toBeInTheDocument();
  });

  it("shows recent searches when input is empty and focused", () => {
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
        recentSearches={["earbuds", "phone case"]}
        onRecentClick={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.focus(input);

    expect(screen.getByText("earbuds")).toBeInTheDocument();
    expect(screen.getByText("phone case")).toBeInTheDocument();
  });

  it("calls onSearch when Search All Platforms is clicked", () => {
    const onSearch = vi.fn();
    render(
      <SearchHeader
        query="test query"
        setQuery={vi.fn()}
        onSearch={onSearch}
        loading={false}
        platforms={[{ id: "amazon", name: "Amazon" }, { id: "ebay", name: "eBay" }]}
        selectedPlatforms={["amazon"]}
        togglePlatform={vi.fn()}
        showFilters={false}
        setShowFilters={vi.fn()}
        recentSearches={[]}
        onRecentClick={vi.fn()}
      />
    );

    const searchButton = screen.getByText("Search All Platforms");
    fireEvent.click(searchButton);

    expect(onSearch).toHaveBeenCalled();
  });

  it("calls onRecentClick when recent search is clicked", () => {
    const onRecentClick = vi.fn();
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
        recentSearches={["earbuds"]}
        onRecentClick={onRecentClick}
      />
    );

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.focus(input);

    const recentItem = screen.getByText("earbuds");
    fireEvent.click(recentItem);

    expect(onRecentClick).toHaveBeenCalledWith("earbuds");
  });

  it("does not render AI panel by default", () => {
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
        onAskAI={vi.fn()}
      />
    );

    expect(screen.queryByPlaceholderText(/describe what you're looking for/i)).not.toBeInTheDocument();
  });

  it("calls onSearch when Enter is pressed in search input", () => {
    const onSearch = vi.fn();
    render(
      <SearchHeader
        query="test query"
        setQuery={vi.fn()}
        onSearch={onSearch}
        loading={false}
        platforms={[{ id: "amazon", name: "Amazon" }]}
        selectedPlatforms={["amazon"]}
        togglePlatform={vi.fn()}
        showFilters={false}
        setShowFilters={vi.fn()}
        recentSearches={[]}
        onRecentClick={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSearch).toHaveBeenCalled();
  });
});

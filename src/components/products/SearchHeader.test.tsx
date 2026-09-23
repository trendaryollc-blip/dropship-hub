import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SearchHeader from "./SearchHeader";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("@/components/products/VisualSearchButton", () => ({
  default: () => <button data-testid="visual-search-button" />,
}));

vi.mock("@/components/ai/VoiceInput", () => ({
  default: () => <button data-testid="voice-input" />,
}));

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
}));

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
    expect(screen.getByPlaceholderText(/looking for/i)).toBeInTheDocument();
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

    const input = screen.getByPlaceholderText(/looking for/i);
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

    const input = screen.getByPlaceholderText(/looking for/i);
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

    const input = screen.getByPlaceholderText(/looking for/i);
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSearch).toHaveBeenCalled();
  });

  it("toggles a platform chip", () => {
    const togglePlatform = vi.fn();
    render(
      <SearchHeader
        query="headphones"
        setQuery={vi.fn()}
        onSearch={vi.fn()}
        loading={false}
        platforms={[{ id: "amazon", name: "Amazon" }]}
        selectedPlatforms={[]}
        togglePlatform={togglePlatform}
        showFilters={false}
        setShowFilters={vi.fn()}
        recentSearches={[]}
        onRecentClick={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Amazon/ }));
    expect(togglePlatform).toHaveBeenCalledWith("amazon");
  });

  it("marks a selected platform chip as pressed", () => {
    render(
      <SearchHeader
        query=""
        setQuery={vi.fn()}
        onSearch={vi.fn()}
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

    expect(screen.getByRole("button", { name: /Amazon/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("clears the search query via the clear button", () => {
    const setQuery = vi.fn();
    render(
      <SearchHeader
        query="headphones"
        setQuery={setQuery}
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

    fireEvent.click(screen.getByLabelText("Clear search"));
    expect(setQuery).toHaveBeenCalledWith("");
  });

  it("disables the search and all-platforms buttons with an empty query", () => {
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

    expect(screen.getByLabelText("Search")).toBeDisabled();
    expect(screen.getByLabelText("Search across all platforms")).toBeDisabled();
  });

  it("passes all platform ids when searching all platforms", () => {
    const onSearch = vi.fn();
    render(
      <SearchHeader
        query="test"
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

    fireEvent.click(screen.getByLabelText("Search across all platforms"));
    expect(onSearch).toHaveBeenCalledWith(["amazon", "ebay"]);
  });

  it("fires onAskAI from an AI suggested prompt pill", () => {
    const onAskAI = vi.fn();
    const setQuery = vi.fn();
    render(
      <SearchHeader
        query=""
        setQuery={setQuery}
        onSearch={vi.fn()}
        loading={false}
        platforms={[]}
        selectedPlatforms={[]}
        togglePlatform={vi.fn()}
        showFilters={false}
        setShowFilters={vi.fn()}
        recentSearches={[]}
        onRecentClick={vi.fn()}
        onAskAI={onAskAI}
      />
    );

    fireEvent.click(screen.getByText("Trending TikTok products"));
    expect(onAskAI).toHaveBeenCalledWith("Trending TikTok products");
    expect(setQuery).toHaveBeenCalledWith("Trending TikTok products");
  });

  it("runs a search when a dynamic suggestion is clicked", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          { text: "wireless earbuds", category: "trending" },
          { text: "wireless charger", category: "category" },
        ],
      }),
    });

    vi.useFakeTimers();
    try {
      const onSearch = vi.fn();
      const setQuery = vi.fn();
      render(
        <SearchHeader
          query="wire"
          setQuery={setQuery}
          onSearch={onSearch}
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

      fireEvent.change(screen.getByPlaceholderText(/looking for/i), { target: { value: "wireless" } });

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      const option = screen.getAllByRole("option").find((o) => o.textContent === "wireless earbuds");
      if (!option) throw new Error("suggestion option not found");
      fireEvent.click(option);

      expect(onSearch).toHaveBeenCalled();
      expect(setQuery).toHaveBeenCalledWith("wireless earbuds");
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears recent search history", () => {
    const removeItem = vi.spyOn(localStorage, "removeItem");
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
        onRecentClick={vi.fn()}
      />
    );

    fireEvent.focus(screen.getByPlaceholderText(/looking for/i));
    fireEvent.click(screen.getByText("Clear history"));

    expect(removeItem).toHaveBeenCalledWith("recentSearches");
    removeItem.mockRestore();
  });
});

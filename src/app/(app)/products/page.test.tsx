import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ProductsPage from "./page";

// ---------------------------------------------------------------- hoisted mocks

const searchParamsState = vi.hoisted(() => ({ current: new URLSearchParams() }));
const routerState = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
const safeFetchMock = vi.hoisted(() => vi.fn());
const historyState = vi.hoisted(() => ({
  history: [] as Array<Record<string, unknown>>,
  addSearch: vi.fn(),
  markProductClicked: vi.fn(),
}));
const trackingState = vi.hoisted(() => ({
  trackSearch: vi.fn(),
  trackClick: vi.fn(),
  trackSave: vi.fn(),
  trackView: vi.fn(),
  trackCompare: vi.fn(),
  getPersonalizationProfile: vi.fn().mockResolvedValue({}),
}));
const DEFAULT_PLATFORM_LIST = vi.hoisted(() => [
  { id: "amazon", name: "Amazon", enabled: true, configured: true },
  { id: "ebay", name: "Ebay", enabled: true, configured: true },
  { id: "aliexpress", name: "Aliexpress", enabled: true, configured: true },
  { id: "cj", name: "CJ", enabled: true, configured: true },
  { id: "google_shopping", name: "Google Shopping", enabled: true, configured: true },
  { id: "walmart", name: "Walmart", enabled: true, configured: true },
  { id: "etsy", name: "Etsy", enabled: true, configured: true },
  { id: "temu", name: "Temu", enabled: true, configured: true },
  { id: "shein", name: "Shein", enabled: true, configured: true },
  { id: "banggood", name: "Banggood", enabled: true, configured: true },
  { id: "dhgate", name: "DHgate", enabled: true, configured: true },
  { id: "alibaba", name: "Alibaba", enabled: true, configured: true },
]);
const useAPIState = vi.hoisted(() => ({ data: { platforms: DEFAULT_PLATFORM_LIST } }));
const fetchMock = vi.hoisted(() => vi.fn());
const savedState = vi.hoisted(() => ({
  isSaved: vi.fn(() => false),
  toggleSave: vi.fn(),
  savedProducts: [],
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsState.current,
  useRouter: () => ({ replace: routerState.replace, push: routerState.push, prefetch: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: (props: { src?: string; alt?: string; [k: string]: unknown }) => <img src={props.src} alt={props.alt} />,
}));

vi.mock("@/components/ai/VoiceInput", () => ({
  default: () => <button data-testid="voice-input" />,
}));

vi.mock("@/components/products/VisualSearchButton", () => ({
  default: () => <button data-testid="visual-search-button" />,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/contexts/SearchTrackingContext", () => ({
  useSearchTracking: () => trackingState,
}));

vi.mock("@/hooks/useSearchHistory", () => ({
  useSearchHistory: () => ({
    history: historyState.history,
    addSearch: historyState.addSearch,
    markProductClicked: historyState.markProductClicked,
    getInterestedProducts: vi.fn(() => []),
    getInterestProfile: vi.fn(() => null),
    getSmartRecommendations: vi.fn(() => []),
    clearHistory: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: useAPIState.data, isLoading: false, error: undefined }),
}));

vi.mock("@/lib/safe-fetch", () => ({ safeFetch: safeFetchMock }));

vi.mock("@/components/saved/SavedProductsProvider", () => ({
  useSavedProducts: () => ({
    isSaved: savedState.isSaved,
    toggleSave: savedState.toggleSave,
    savedProducts: savedState.savedProducts,
  }),
}));

vi.mock("@/components/fulfillment/SupplierPicker", () => ({
  SupplierPicker: () => <div data-testid="supplier-picker" />,
}));

// ---------------------------------------------------------------- fixtures

function searchPayload(overrides: Record<string, unknown> = {}) {
  return {
    platforms: [
      { platform: "amazon", name: "Amazon", resultCount: 2, total: 2, data: [] as unknown[] },
    ],
    platformErrors: [] as Array<Record<string, unknown>>,
    mergedProducts: [
      { id: "p1", title: "Wireless Earbuds Pro", price: 24.99, image: "https://img.example.com/1.jpg", link: "https://amazon.com/dp/B0TEST1", source: "amazon", rating: 4.5, reviews: 1200, estimatedMargin: 62 },
      { id: "p2", title: "Phone Case", price: 9.99, image: "https://img.example.com/2.jpg", link: "https://amazon.com/dp/B0TEST2", source: "aliexpress", rating: 4.0, reviews: 200 },
    ],
    ...overrides,
  } as Record<string, unknown>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function searchInput() {
  return screen.getByRole("combobox", { name: "Search products" });
}

function runSearch(value: string) {
  fireEvent.change(searchInput(), { target: { value } });
  fireEvent.keyDown(searchInput(), { key: "Enter", code: "Enter" });
}

beforeEach(() => {
  searchParamsState.current = new URLSearchParams();
  routerState.replace.mockClear();
  routerState.push.mockClear();
  safeFetchMock.mockReset();
  safeFetchMock.mockResolvedValue({});
  historyState.history = [];
  historyState.addSearch.mockClear();
  historyState.markProductClicked.mockClear();
  trackingState.trackSearch.mockClear();
  useAPIState.data = { platforms: DEFAULT_PLATFORM_LIST };
  savedState.isSaved.mockClear();
  savedState.toggleSave.mockClear();
  savedState.isSaved.mockReturnValue(false);
  localStorage.clear();
  sessionStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ suggestions: [] }) });
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------- tests

describe("ProductsPage - discovery (initial state)", () => {
  it("renders the search hero and discovery sections when there is no history and no URL query", async () => {
    render(<ProductsPage />);
    expect(searchInput()).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.getByText("Trending Right Now")).toBeInTheDocument();
    expect(screen.getByText("How It Works")).toBeInTheDocument();
  });
});

describe("ProductsPage - search flow", () => {
  it("performs a search on Enter, renders results, syncs URL, saves recent search, tracks, and fires addSearch", async () => {
    safeFetchMock.mockResolvedValue(searchPayload());
    render(<ProductsPage />);
    runSearch("earbuds");

    await waitFor(() => expect(screen.getByText("Wireless Earbuds Pro")).toBeInTheDocument());
    expect(screen.getByText("Phone Case")).toBeInTheDocument();

    expect(safeFetchMock).toHaveBeenCalledWith(
      "/api/platforms/search-all",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"query":"earbuds"'),
      })
    );
    expect(routerState.replace).toHaveBeenCalledWith("/products?q=earbuds");
    expect(JSON.parse(localStorage.getItem("recentSearches") as string)).toContain("earbuds");
    expect(trackingState.trackSearch).toHaveBeenCalledWith("earbuds", 2);
    expect(historyState.addSearch).toHaveBeenCalledWith("earbuds", expect.any(Array), expect.any(Array));
  });

  it("shows platform progress with humanized platform names while loading", async () => {
    const pending = deferred<Record<string, unknown>>();
    safeFetchMock.mockReturnValueOnce(pending.promise);
    render(<ProductsPage />);
    runSearch("earbuds");

    expect(screen.getByText("Searching platforms...")).toBeInTheDocument();
    expect(screen.getByText("Google Shopping")).toBeInTheDocument();

    await actResolve(pending, searchPayload());
    expect(await screen.findByText("Wireless Earbuds Pro")).toBeInTheDocument();
  });

  it("resolves platform display names from the API platform list for a selected platform", async () => {
    useAPIState.data = {
      platforms: [
        { id: "temu", name: "Temu (US)", enabled: true, configured: true },
        { id: "amazon", name: "Amazon", enabled: true, configured: true },
      ],
    };
    const pending = deferred<Record<string, unknown>>();
    safeFetchMock.mockReturnValueOnce(pending.promise);
    render(<ProductsPage />);

    fireEvent.click(await screen.findByRole("button", { name: /temu/i }));
    runSearch("earbuds");

    expect(screen.getByText("Temu (US)")).toBeInTheDocument();
    await actResolve(pending, searchPayload());
    expect(await screen.findByText("Wireless Earbuds Pro")).toBeInTheDocument();
    expect(safeFetchMock).toHaveBeenCalledWith(
      "/api/platforms/search-all",
      expect.objectContaining({ body: expect.stringContaining('"platforms":["temu"]') })
    );
  });

  it("shows the empty state when a search returns no merged products", async () => {
    safeFetchMock.mockResolvedValue(searchPayload({ mergedProducts: [] }));
    render(<ProductsPage />);
    runSearch("nothing");

    expect(await screen.findByText("No products found")).toBeInTheDocument();
    expect(screen.getByText("Try a different search query or enable more platforms")).toBeInTheDocument();
  });

  it("shows a network error message when the search request fails, then recovers on a retry", async () => {
    safeFetchMock.mockRejectedValueOnce(new Error("down"));
    render(<ProductsPage />);
    runSearch("earbuds");

    expect(await screen.findByText("Network error - please try again")).toBeInTheDocument();

    safeFetchMock.mockResolvedValue(searchPayload());
    runSearch("earbuds");
    expect(await screen.findByText("Wireless Earbuds Pro")).toBeInTheDocument();
    expect(screen.queryByText("Network error - please try again")).not.toBeInTheDocument();
  });

  it("surfaces a soft warning and platform error list when a platform returns no results", async () => {
    safeFetchMock.mockResolvedValue(
      searchPayload({
        platforms: [{ platform: "amazon", name: "Amazon", resultCount: 0, data: [] }],
        mergedProducts: [],
        platformErrors: [{ platform: "amazon", name: "Amazon", error: "Rate limited" }],
      })
    );
    render(<ProductsPage />);
    runSearch("earbuds");

    expect(await screen.findByText(/Some platforms didn't respond/i)).toBeInTheDocument();
    expect(screen.getByText("1 platform returned no results:")).toBeInTheDocument();
    expect(screen.getByText(/Rate limited/)).toBeInTheDocument();
  });

  it("restores results from the sessionStorage cache without hitting the network", async () => {
    sessionStorage.setItem(
      "search_v2_all_earbuds",
      JSON.stringify({
        query: "earbuds",
        results: [{ id: "c1", title: "Cached Result", price: 12, image: null, link: "https://amazon.com/dp/X", source: "amazon" }],
        platformResults: [],
      })
    );
    render(<ProductsPage />);
    runSearch("earbuds");

    expect(screen.getByText("Cached Result")).toBeInTheDocument();
    expect(safeFetchMock).not.toHaveBeenCalled();
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  it("restores the last search from history on mount without fetching", async () => {
    historyState.history = [
      {
        query: "past",
        results: [{ id: "h1", title: "From History Product", price: 15, image: null, link: "#", source: "amazon" }],
        platforms: ["amazon"],
        timestamp: Date.now(),
        clickedProductIds: [],
      },
    ];
    render(<ProductsPage />);

    expect(await screen.findByText("From History Product")).toBeInTheDocument();
    expect(safeFetchMock).not.toHaveBeenCalled();
  });

  it("increments the visible result count when Load more is clicked", async () => {
    const many = Array.from({ length: 26 }, (_, i) => ({
      id: `prod-${i}`,
      title: `Test Product ${i + 1}`,
      price: i + 1,
      image: `https://img.example.com/${i}.jpg`,
      link: `https://amazon.com/dp/ITEM${i}`,
      source: "amazon",
    }));
    safeFetchMock.mockResolvedValue(searchPayload({ mergedProducts: many }));
    render(<ProductsPage />);
    runSearch("test");

    expect(await screen.findByText("Test Product 1")).toBeInTheDocument();
    expect(screen.queryByText("Test Product 25")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Load more \(2 remaining\)/i }));

    expect(await screen.findByText("Test Product 25", undefined, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.queryByText(/Load more/i)).not.toBeInTheDocument();
  });
});

describe("ProductsPage - results interactions", () => {
  it("reorders results when the sort control changes to price ascending", async () => {
    safeFetchMock.mockResolvedValue(searchPayload());
    const { container } = render(<ProductsPage />);
    runSearch("earbuds");
    await screen.findByText("Wireless Earbuds Pro");

    fireEvent.change(screen.getByLabelText("Sort results"), { target: { value: "price-asc" } });

    const titles = Array.from(container.querySelectorAll("h3")).map((h) => h.textContent);
    expect(titles).toEqual(["Phone Case", "Wireless Earbuds Pro"]);
  });

  it("switches between grid and list view with the view toggle", async () => {
    safeFetchMock.mockResolvedValue(searchPayload());
    render(<ProductsPage />);
    runSearch("earbuds");
    await screen.findByText("Wireless Earbuds Pro");

    const gridToggle = screen.getByRole("button", { name: "Grid view" });
    const listToggle = screen.getByRole("button", { name: "List view" });

    expect(gridToggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button", { name: "AI Actions" })).toHaveLength(2);

    fireEvent.click(listToggle);

    expect(listToggle).toHaveAttribute("aria-pressed", "true");
    expect(gridToggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryAllByRole("button", { name: "AI Actions" })).toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "Save to favorites" })).toHaveLength(2);

    fireEvent.click(gridToggle);

    expect(gridToggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button", { name: "AI Actions" })).toHaveLength(2);
  });

  it("caps the compare basket at 4 products via title links", async () => {
    const five = Array.from({ length: 5 }, (_, i) => ({
      id: `prod-${i + 1}`,
      title: `Test Product ${i + 1}`,
      price: (i + 1) * 10,
      image: null,
      link: `https://amazon.com/dp/ITEM${i + 1}`,
      source: "amazon",
    }));
    safeFetchMock.mockResolvedValue(searchPayload({ mergedProducts: five }));
    render(<ProductsPage />);
    runSearch("test");

    await screen.findByText("Test Product 1");
    fireEvent.click(screen.getByRole("button", { name: "Compare Products" }));
    expect(screen.getByRole("button", { name: "Exit Compare" })).toBeInTheDocument();

    for (let i = 1; i <= 5; i++) {
      fireEvent.click(screen.getByRole("link", { name: `Test Product ${i}` }));
    }

    expect(screen.getByText("4/4 selected")).toBeInTheDocument();
    expect(screen.queryByText("5/4 selected")).not.toBeInTheDocument();
    expect(routerState.push).not.toHaveBeenCalled();
  });

  it("saves a product to favorites with the full payload", async () => {
    safeFetchMock.mockResolvedValue(searchPayload());
    render(<ProductsPage />);
    runSearch("earbuds");
    await screen.findByText("Wireless Earbuds Pro");

    fireEvent.click(screen.getAllByRole("button", { name: "Save to favorites" })[0]);

    expect(savedState.toggleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "p1",
        title: "Wireless Earbuds Pro",
        price: 24.99,
        image: "https://img.example.com/1.jpg",
        link: "https://amazon.com/dp/B0TEST1",
        source: "amazon",
        rating: 4.5,
        reviews: 1200,
        savedAt: expect.any(Number),
      })
    );
  });

  it("records product-click analytics and navigates to the product page", async () => {
    safeFetchMock.mockResolvedValue(searchPayload());
    render(<ProductsPage />);
    runSearch("earbuds");
    await screen.findByText("Wireless Earbuds Pro");

    fireEvent.click(screen.getByRole("link", { name: "Wireless Earbuds Pro" }));

    expect(historyState.markProductClicked).toHaveBeenCalledWith("p1");
    expect(trackingState.trackClick).toHaveBeenCalledWith("p1", "", "amazon");
    expect(routerState.push).toHaveBeenCalledWith(expect.stringContaining("/products/p1?"));
    expect(JSON.parse(sessionStorage.getItem("selectedProduct") as string).id).toBe("p1");
  });
});

describe("ProductsPage - URL-driven behavior", () => {
  it("auto-triggers a search from the ?q= URL parameter on mount", async () => {
    searchParamsState.current = new URLSearchParams("q=earbuds");
    safeFetchMock.mockResolvedValue(searchPayload());
    render(<ProductsPage />);

    expect(await screen.findByText("Wireless Earbuds Pro")).toBeInTheDocument();
    expect(safeFetchMock).toHaveBeenCalledWith(
      "/api/platforms/search-all",
      expect.objectContaining({ body: expect.stringContaining('"query":"earbuds"') })
    );
  });

  it("applies ?maxPrice and ?minMargin constraints to the filtered results", async () => {
    searchParamsState.current = new URLSearchParams("q=earbuds&maxPrice=25&minMargin=60");
    safeFetchMock.mockResolvedValue(
      searchPayload({
        mergedProducts: [
          { id: "p1", title: "Cheap Earbuds", price: 19.99, image: "https://img.example.com/1.jpg", link: "https://amazon.com/dp/B0TEST1", source: "amazon", estimatedMargin: 70 },
          { id: "p2", title: "Premium Earbuds", price: 99.99, image: "https://img.example.com/2.jpg", link: "https://amazon.com/dp/B0TEST2", source: "amazon", estimatedMargin: 30 },
        ],
      })
    );
    render(<ProductsPage />);

    expect(await screen.findByText("Cheap Earbuds")).toBeInTheDocument();
    expect(screen.queryByText("Premium Earbuds")).not.toBeInTheDocument();
  });

  it("auto-selects ?compare products from the dashboard once results resolve", async () => {
    searchParamsState.current = new URLSearchParams("q=earbuds&compare=Wireless%20Earbuds%20Pro");
    safeFetchMock.mockResolvedValue(searchPayload());
    render(<ProductsPage />);

    expect(await screen.findByText("1/4 selected")).toBeInTheDocument();
  });

  it("auto-selects multiple ?compare products and aggregates the counter", async () => {
    searchParamsState.current = new URLSearchParams(
      "q=earbuds&compare=Wireless%20Earbuds%20Pro&compare=Phone%20Case"
    );
    safeFetchMock.mockResolvedValue(searchPayload());
    render(<ProductsPage />);

    expect(await screen.findByText("2/4 selected")).toBeInTheDocument();
  });

  it("shows the filtered-empty state for strict URL constraints and recovers on Clear all filters", async () => {
    searchParamsState.current = new URLSearchParams("q=earbuds&maxPrice=5");
    safeFetchMock.mockResolvedValue(searchPayload());
    render(<ProductsPage />);

    expect(await screen.findByText("No products match your filters")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));

    expect(await screen.findByText("Wireless Earbuds Pro")).toBeInTheDocument();
    expect(screen.queryByText("No products match your filters")).not.toBeInTheDocument();
  });
});

describe("ProductsPage - input affordances", () => {
  it("searches from a recent-search chip and drives handleSearch", async () => {
    localStorage.setItem("recentSearches", JSON.stringify(["gaming chair"]));
    safeFetchMock.mockResolvedValue(searchPayload());
    render(<ProductsPage />);

    fireEvent.focus(searchInput());
    expect(screen.getByText("Recent")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "gaming chair" }));
    await waitFor(() =>
      expect(safeFetchMock).toHaveBeenCalledWith(
        "/api/platforms/search-all",
        expect.objectContaining({ body: expect.stringContaining('"query":"gaming chair"') })
      )
    );
    expect(routerState.replace).toHaveBeenCalledWith(expect.stringContaining("/products?q=gaming"));
  });

  it("runs the natural-language AI path from a suggestion pill and sends the parsed intent", async () => {
    safeFetchMock.mockResolvedValue(
      searchPayload({
        platforms: [{ platform: "tiktok", name: "TikTok", resultCount: 1, total: 1, data: [] as unknown[] }],
        mergedProducts: [
          {
            id: "p1",
            title: "Wireless Earbuds Pro",
            price: 24.99,
            image: "https://img.example.com/1.jpg",
            link: "https://tiktok.com/item/1",
            source: "tiktok",
            brand: "TikTok",
            rating: 4.5,
            reviews: 900,
            estimatedMargin: 60,
            trendPhase: "growth",
          },
        ],
      })
    );
    render(<ProductsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Trending TikTok products" }));

    expect(await screen.findByText("Wireless Earbuds Pro")).toBeInTheDocument();
    await waitFor(() =>
      expect(safeFetchMock).toHaveBeenCalledWith(
        "/api/platforms/search-all",
        expect.objectContaining({ body: expect.stringContaining('"intent"') })
      )
    );
  });
});

async function actResolve<T extends Record<string, unknown>>(pending: { promise: Promise<T>; resolve: (v: T) => void }, value: T) {
  await act(async () => {
    pending.resolve(value);
    await pending.promise;
  });
}
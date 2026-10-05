import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ProductDetailPage, { buildProductUrl } from "./page";

// ---------------------------------------------------------------- hoisted mocks

const searchParamsState = vi.hoisted(() => ({ current: new URLSearchParams() }));
const safeFetchMock = vi.hoisted(() => vi.fn());
const gf = vi.hoisted(() => vi.fn());

const detailEnv = vi.hoisted(() => ({
  images: [] as string[],
  enrich: {} as Record<string, unknown>,
  reviews: {} as Record<string, unknown>,
  marketIntel: {} as Record<string, unknown>,
  listing: {} as Record<string, unknown>,
  matchImage: {} as Record<string, unknown>,
  enrichFail: false,
  imagesDeferred: null as { promise: Promise<Record<string, unknown>>; resolve: (v: Record<string, unknown>) => void } | null,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsState.current,
  useParams: () => ({ id: "" }),
}));

vi.mock("next/image", () => ({
  default: (props: { src?: string; alt?: string; [k: string]: unknown }) => <img src={props.src} alt={props.alt} />,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/lib/safe-fetch", () => ({ safeFetch: safeFetchMock }));

vi.mock("@/components/saved/SavedProductsProvider", () => ({
  useSavedProducts: () => ({ isSaved: () => false, toggleSave: vi.fn(), savedProducts: [] }),
}));

// ---------------------------------------------------------------- fixtures

const DETAIL_PRODUCT = {
  id: "d1",
  title: "Wireless Headphones",
  price: 29.99,
  image: "https://img.example.com/h.jpg",
  images: ["https://img.example.com/h.jpg", "https://img.example.com/h2.jpg", "https://img.example.com/h3.jpg"],
  link: "https://amazon.com/dp/B0ASIN123X",
  source: "amazon",
  rating: 4.5,
  reviews: 1234,
};

const RICH_ENRICH = {
  platforms: [
    { platform: "ebay", price: 10.99, rating: 4.2, reviews: 80, inStock: true, url: "https://ebay.com/itm/1" },
  ],
  cheapest: { platform: "ebay", price: 10.99 },
  mostExpensive: { platform: "amazon", price: 29.99 },
  priceSpread: 3.5,
  supplierMatches: [],
};

function setDetailEnv(overrides: Partial<typeof detailEnv> = {}, flags: { enrichFail?: boolean } = {}) {
  detailEnv.images = (overrides.images as string[]) ?? [];
  detailEnv.enrich = (overrides.enrich as Record<string, unknown>) ?? {};
  detailEnv.reviews = (overrides.reviews as Record<string, unknown>) ?? {};
  detailEnv.marketIntel = (overrides.marketIntel as Record<string, unknown>) ?? {};
  detailEnv.listing = (overrides.listing as Record<string, unknown>) ?? {};
  detailEnv.matchImage = (overrides.matchImage as Record<string, unknown>) ?? {};
  detailEnv.enrichFail = flags.enrichFail ?? false;
  detailEnv.imagesDeferred = null;
}

function installDetailImpl() {
  safeFetchMock.mockImplementation(async (url: unknown) => {
    const u = String(url);
    if (detailEnv.imagesDeferred && u.includes("/platforms/product-images")) {
      return detailEnv.imagesDeferred.promise;
    }
    if (u.includes("/platforms/product-images")) {
      return { images: detailEnv.images };
    }
    if (u.includes("/products/enrich")) {
      if (detailEnv.enrichFail) throw new Error("upstream down");
      return detailEnv.enrich;
    }
    if (u.includes("/products/match-image")) return detailEnv.matchImage;
    if (u.includes("/products/reviews")) return detailEnv.reviews;
    if (u.includes("/products/market-intel")) return detailEnv.marketIntel;
    if (u.includes("/products/listing")) return detailEnv.listing;
    return {};
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

// Flushes pending promise updates (effects / safeFetch resolutions) inside
// act() so React state settles before the next phase of the test.
async function settle() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  });
}

function seedProduct(overrides: Record<string, unknown> = {}) {
  const product = { ...DETAIL_PRODUCT, ...overrides };
  sessionStorage.setItem("selectedProduct", JSON.stringify(product));
  return product;
}

beforeEach(() => {
  searchParamsState.current = new URLSearchParams();
  safeFetchMock.mockReset();
  setDetailEnv();
  localStorage.clear();
  sessionStorage.clear();
  gf.mockReset();
  gf.mockResolvedValue({ ok: true, json: async () => ({}) });
  global.fetch = gf as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------- buildProductUrl unit coverage

describe("buildProductUrl", () => {
  it("returns a real link unchanged", () => {
    expect(buildProductUrl("https://example.com/item", "amazon", "X")).toBe("https://example.com/item");
  });

  it("maps each platform to its search URL when the link is '#'", () => {
    expect(buildProductUrl("#", "amazon", "Wireless Earbuds")).toBe("https://www.amazon.com/s?k=Wireless%20Earbuds");
    expect(buildProductUrl("#", "ebay", "Wireless Earbuds")).toBe("https://www.ebay.com/sch/i.html?_nkw=Wireless%20Earbuds");
    expect(buildProductUrl("#", "aliexpress", "Wireless Earbuds")).toBe("https://www.aliexpress.com/wholesale?SearchText=Wireless%20Earbuds");
    expect(buildProductUrl("#", "walmart", "Wireless Earbuds")).toBe("https://www.walmart.com/search?q=Wireless%20Earbuds");
    expect(buildProductUrl("#", "google_shopping", "Wireless Earbuds")).toBe("https://www.google.com/search?q=Wireless%20Earbuds&tbm=shop");
    expect(buildProductUrl("#", "shein", "Wireless Earbuds")).toBe("https://us.shein.com/pdsearch/Wireless%20Earbuds/");
    expect(buildProductUrl("#", "etsy", "Wireless Earbuds")).toBe("https://www.etsy.com/search?q=Wireless%20Earbuds");
    expect(buildProductUrl("#", "alibaba", "Wireless Earbuds")).toBe("https://www.alibaba.com/trade/search?SearchText=Wireless%20Earbuds");
    expect(buildProductUrl("#", "dhgate", "Wireless Earbuds")).toBe("https://www.dhgate.com/wholesale/search.do?searchkey=Wireless%20Earbuds");
  });

  it("falls back to a branded landing page for platforms without a search URL", () => {
    expect(buildProductUrl("#", "cj", "Wireless Earbuds")).toBe("https://www.cjdropshipping.com/");
    expect(buildProductUrl("#", "temu", "Wireless Earbuds")).toBe("https://www.temu.com/");
  });

  it("falls back to a Google search for unknown sources", () => {
    expect(buildProductUrl("#", "mystery_store", "Wireless Earbuds")).toBe("https://www.google.com/search?q=Wireless%20Earbuds");
  });

  it("treats an empty link as a missing link", () => {
    expect(buildProductUrl("", "amazon", "Wireless Earbuds")).toBe("https://www.amazon.com/s?k=Wireless%20Earbuds");
  });

  it("upgrades a stored legacy CJ link to the canonical product URL", () => {
    expect(buildProductUrl("https://cjdropshipping.com/product-p-2609250256581624900", "cj", "Coffee Machine")).toBe(
      "https://www.cjdropshipping.com/product/-p-2609250256581624900.html"
    );
  });
});

// ---------------------------------------------------------------- page behavior

describe("ProductDetailPage - data sources", () => {
  it("presents product research sections in the seller decision order without duplicate next steps", async () => {
    seedProduct();
    installDetailImpl();
    render(<ProductDetailPage />);
    await settle();

    const orderedSections = Array.from(document.querySelectorAll(
      "#overview, #image-matches, #market-intel, #price-comparison, #reviews, #suppliers, #calculator, #listings, #similar, #searches"
    )).map((section) => section.id);

    expect(orderedSections).toEqual([
      "overview",
      "image-matches",
      "market-intel",
      "price-comparison",
      "reviews",
      "suppliers",
      "calculator",
      "listings",
      "similar",
      "searches",
    ]);
    expect(screen.queryByText("Next Steps")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Competitor analysis" })).toHaveAttribute(
      "href",
      "/competitors?q=Wireless%20Headphones"
    );
  });

  it("renders the product from sessionStorage with gallery, stats, and category", async () => {
    seedProduct();
    installDetailImpl();
    render(<ProductDetailPage />);

    expect(await screen.findByRole("heading", { level: 1, name: "Wireless Headphones" })).toBeInTheDocument();
    expect(screen.getAllByText(/29\.99/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("4.5").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1,234/).length).toBeGreaterThan(0);
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText("Related Searches")).toBeInTheDocument();
  });

  it("offers same-tab product-aware links to dedicated research tools", async () => {
    setDetailEnv({
      enrich: RICH_ENRICH,
      reviews: { averageRating: 4.3, totalReviews: 860 },
      marketIntel: {
        searchVolume: "medium",
        estimatedSellers: 22,
        avgSellerRating: 4.2,
        interestIndex: 76,
        trendSparkline: [10, 25, 76],
        competitionLevel: "high",
      },
    });
    seedProduct();
    installDetailImpl();
    render(<ProductDetailPage />);
    await settle();

    const tools = screen.getByRole("navigation", { name: "Product-specific tools" });
    const suppliersLink = screen.getByRole("link", { name: /Find suppliers/ });
    const competitorsLink = screen.getByRole("link", { name: /Analyze competitors/ });
    const calculatorLink = screen.getByRole("link", { name: /Model profitability/ });
    const validationLink = screen.getByRole("link", { name: /Validate product/ });
    const listingLink = screen.getByRole("link", { name: /Create a listing/ });
    const reviewsLink = screen.getByRole("link", { name: /Import reviews/ });
    const contentLink = screen.getByRole("link", { name: /Create social content/ });
    const complianceLink = screen.getByRole("link", { name: /Check compliance/ });
    const priceWarLink = screen.getByRole("link", { name: /Set a price rule/ });
    const trendsLink = screen.getByRole("link", { name: /Analyze product trend/ });
    const lifecycleLink = screen.getByRole("link", { name: /Track lifecycle/ });

    expect(tools).toBeInTheDocument();
    expect(suppliersLink).toHaveAttribute("href", "/suppliers?product=Wireless+Headphones&category=General&source=amazon&price=29.99");
    expect(competitorsLink).toHaveAttribute("href", "/competitors?q=Wireless%20Headphones");
    expect(calculatorLink).toHaveAttribute("href", "/calculator/profit?cost=29.99&price=65.98");
    expect(validationLink).toHaveAttribute("href", expect.stringContaining("/product-validation?productTitle=Wireless+Headphones"));
    expect(validationLink).toHaveAttribute("href", expect.stringContaining("productImage=https%3A%2F%2Fimg.example.com%2Fh.jpg"));
    const validationParams = new URL(validationLink.getAttribute("href")!, "https://example.test").searchParams;
    expect(validationParams.get("source")).toBe("amazon");
    expect(validationParams.get("productCost")).toBe("29.99");
    expect(validationParams.get("estimatedSellingPrice")).toBe("65.98");
    expect(validationParams.get("rating")).toBe("4.3");
    expect(validationParams.get("reviews")).toBe("860");
    expect(validationParams.get("bestPrice")).toBe("10.99");
    expect(validationParams.get("competitorCount")).toBe("22");
    expect(validationParams.get("sellerRating")).toBe("4.2");
    expect(validationParams.get("searchInterestIndex")).toBe("76");
    expect(validationParams.get("historicalInterestIndex")).toBe("10,25,76");
    expect(validationParams.get("saturationLevel")).toBe("saturated");
    expect(JSON.parse(validationParams.get("platformPrices") || "[]")).toEqual([
      { platform: "ebay", price: 10.99, rating: 4.2, reviews: 80 },
    ]);
    expect(listingLink).toHaveAttribute("href", "/product-listings?title=Wireless+Headphones&price=29.99&category=General&platform=amazon");
    const reviewParams = new URL(reviewsLink.getAttribute("href")!, "https://example.test").searchParams;
    expect(reviewParams.get("productTitle")).toBe("Wireless Headphones");
    expect(reviewParams.get("productUrl")).toBe("https://amazon.com/dp/B0ASIN123X");
    expect(reviewParams.get("source")).toBe("amazon");
    const contentParams = new URL(contentLink.getAttribute("href")!, "https://example.test").searchParams;
    expect(contentParams.get("productTitle")).toBe("Wireless Headphones");
    expect(contentParams.get("productImage")).toBe("https://img.example.com/h.jpg");
    const complianceParams = new URL(complianceLink.getAttribute("href")!, "https://example.test").searchParams;
    expect(complianceParams.get("productTitle")).toBe("Wireless Headphones");
    expect(complianceParams.get("sellingPrice")).toBe("29.99");
    expect(complianceParams.get("productImage")).toBe("https://img.example.com/h.jpg");
    const priceWarParams = new URL(priceWarLink.getAttribute("href")!, "https://example.test").searchParams;
    expect(priceWarParams.get("productTitle")).toBe("Wireless Headphones");
    expect(priceWarParams.get("cost")).toBe("29.99");
    expect(priceWarParams.get("myPrice")).toBe("65.98");
    expect(priceWarParams.get("platforms")).toBe("amazon");
    const trendParams = new URL(trendsLink.getAttribute("href")!, "https://example.test").searchParams;
    expect(trendParams.get("keyword")).toBe("Wireless Headphones");
    expect(trendParams.get("imageUrl")).toBe("https://img.example.com/h.jpg");
    const lifecycleParams = new URL(lifecycleLink.getAttribute("href")!, "https://example.test").searchParams;
    expect(lifecycleParams.get("productTitle")).toBe("Wireless Headphones");
    expect(lifecycleParams.get("productImage")).toBe("https://img.example.com/h.jpg");
    [suppliersLink, competitorsLink, calculatorLink, validationLink, listingLink, reviewsLink, contentLink, complianceLink, priceWarLink, trendsLink, lifecycleLink].forEach((link) => {
      expect(link).not.toHaveAttribute("target", "_blank");
    });

    fireEvent.click(competitorsLink);
    expect(JSON.parse(sessionStorage.getItem("competitorProduct") || "{}")).toMatchObject({
      title: "Wireless Headphones",
      price: 29.99,
      image: "https://img.example.com/h.jpg",
      source: "amazon",
      rating: 4.5,
      reviews: 1234,
    });
  });

  it("renders a fallback product from URL params when sessionStorage is empty", async () => {
    searchParamsState.current = new URLSearchParams("t=Yoga+Mat&p=15&src=walmart&r=4&rev=40");
    installDetailImpl();
    render(<ProductDetailPage />);

    expect(await screen.findByRole("heading", { level: 1, name: "Yoga Mat" })).toBeInTheDocument();
    expect(screen.getByText("SKU-YOGAMAT")).toBeInTheDocument();
    expect(screen.getByText("Search walmart for this product")).toBeInTheDocument();
    expect(screen.getByText(/Direct product link unavailable/)).toBeInTheDocument();
    expect(screen.getAllByText(/15\.00/).length).toBeGreaterThan(0);
  });

  it("shows the product-not-found state when there is no product data", () => {
    installDetailImpl();
    render(<ProductDetailPage />);

    expect(screen.getByText("Product not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Search Products" })).toHaveAttribute("href", "/products");
    expect(safeFetchMock).not.toHaveBeenCalled();
  });

  it("shows the image backfill progress and then swaps in the fetched images", async () => {
    seedProduct({ images: ["https://img.example.com/h.jpg"] });
    const pending = deferred<{ images: string[] }>();
    detailEnv.imagesDeferred = pending as never;
    installDetailImpl();
    render(<ProductDetailPage />);

    expect(screen.getByText("Fetching all product images...")).toBeInTheDocument();

    await act(async () => {
      pending.resolve({ images: ["https://img.example.com/a.jpg", "https://img.example.com/b.jpg", "https://img.example.com/c.jpg"] });
      await pending.promise;
    });

    expect(await screen.findByText("4 images available from amazon")).toBeInTheDocument();
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
  });

  it("fetches and merges source images when the search result already has multiple images", async () => {
    setDetailEnv({ images: ["https://img.example.com/h2.jpg", "https://img.example.com/h3.jpg"] });
    seedProduct({ images: ["https://img.example.com/h.jpg", "https://img.example.com/h2.jpg"] });
    installDetailImpl();
    render(<ProductDetailPage />);

    expect(await screen.findByText("3 images available from amazon")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(safeFetchMock).toHaveBeenCalledWith("/api/platforms/product-images", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"source":"amazon"'),
    }));
  });

  it("navigates the gallery via thumbnails", async () => {
    seedProduct();
    installDetailImpl();
    render(<ProductDetailPage />);

    const thumb = await screen.findByRole("img", { name: "Wireless Headphones thumbnail 3" });
    fireEvent.click(thumb.closest("button") as HTMLButtonElement);

    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });
});

describe("ProductDetailPage - # link fallback", () => {
  it("rewrites the '#'' placeholder CTA to a platform search URL instead of a dead link", async () => {
    seedProduct({ link: "#" });
    installDetailImpl();
    render(<ProductDetailPage />);

    const ctas = screen.getAllByRole("link", { name: /search amazon for this product/i });
    expect(ctas.length).toBeGreaterThan(0);
    ctas.forEach((c) => expect(c).toHaveAttribute("href", "https://www.amazon.com/s?k=Wireless%20Headphones"));
    expect(screen.getByText(/Direct product link unavailable/)).toBeInTheDocument();

    await settle();
  });

  it("keeps a real product link as-is", async () => {
    seedProduct({ link: "https://amazon.com/dp/B0REALLINK" });
    installDetailImpl();
    render(<ProductDetailPage />);

    const ctas = screen.getAllByRole("link", { name: /view on amazon/i });
    expect(ctas.length).toBeGreaterThan(0);
    ctas.forEach((c) => expect(c).toHaveAttribute("href", "https://amazon.com/dp/B0REALLINK"));

    await settle();
  });

  it("upgrades a stored legacy CJ link so the CTA no longer lands on cjdropshipping.com/404", async () => {
    seedProduct({
      link: "https://cjdropshipping.com/product-p-2609250256581624900",
      source: "cj",
    });
    installDetailImpl();
    render(<ProductDetailPage />);

    const ctas = screen.getAllByRole("link", { name: /view on cj/i });
    expect(ctas.length).toBeGreaterThan(0);
    ctas.forEach((c) =>
      expect(c).toHaveAttribute("href", "https://www.cjdropshipping.com/product/-p-2609250256581624900.html")
    );

    await settle();
  });
});

describe("ProductDetailPage - data fetching", () => {
  it("shows an unavailable state instead of a failure when the review endpoint has no data", async () => {
    setDetailEnv({ reviews: {} });
    seedProduct({ rating: undefined, reviews: undefined });
    installDetailImpl();
    render(<ProductDetailPage />);

    expect(await screen.findByText("Review data unavailable")).toBeInTheDocument();
    expect(screen.getByText("This platform did not provide review details for this listing.")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load review data")).not.toBeInTheDocument();
  });

  it("searches marketplaces by the product image only when requested", async () => {
    setDetailEnv({
      matchImage: {
        matches: [{
          title: "Wireless Headphones listing",
          platform: "ebay",
          url: "https://www.ebay.com/itm/123",
          image: "https://img.example.com/match.jpg",
          price: "$18.00",
          matchType: "exact",
        }, {
          title: "Similar listing without an advertised price",
          platform: "etsy",
          url: "https://www.etsy.com/listing/456",
          image: null,
          price: null,
          matchType: "visual",
        }],
      },
    });
    seedProduct({ images: ["https://img.example.com/h.jpg"] });
    installDetailImpl();
    render(<ProductDetailPage />);

    expect(safeFetchMock).not.toHaveBeenCalledWith("/api/products/match-image", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Search by image" }));

    expect(await screen.findByText("Exact image match")).toBeInTheDocument();
    expect(screen.getByText("Wireless Headphones listing")).toBeInTheDocument();
    expect(screen.getByText("Price unavailable")).toBeInTheDocument();
    expect(safeFetchMock).toHaveBeenCalledWith("/api/products/match-image", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ imageUrl: "https://img.example.com/h.jpg", source: "amazon" }),
    }));
  });

  it("fires all five data effects with the right endpoints and bodies", async () => {
    setDetailEnv({
      enrich: RICH_ENRICH,
      reviews: { averageRating: 4.2, totalReviews: 900 },
      marketIntel: { searchVolume: "medium", interestIndex: 50, trendDirection: "rising", riskScore: 20 },
      listing: { title: "Optimized Listing Title" },
    });
    seedProduct({ images: ["https://img.example.com/h.jpg"] });
    installDetailImpl();
    render(<ProductDetailPage />);

    await waitFor(() => expect(safeFetchMock).toHaveBeenCalledWith("/api/products/enrich", expect.objectContaining({ method: "POST", body: expect.stringContaining('"title":"Wireless Headphones"') })));
    expect(safeFetchMock).toHaveBeenCalledWith("/api/products/reviews", expect.objectContaining({ method: "POST" }));
    expect(safeFetchMock).toHaveBeenCalledWith("/api/products/market-intel", expect.objectContaining({ method: "POST" }));
    expect(safeFetchMock).toHaveBeenCalledWith("/api/products/listing", expect.objectContaining({ method: "POST" }));
    expect(safeFetchMock).toHaveBeenCalledWith("/api/platforms/product-images", expect.objectContaining({ method: "POST", body: expect.stringContaining("B0ASIN123X") }));

    await settle();
  });

  it("shows an error with a working Retry when enrichment fails, and renders data after retry", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    setDetailEnv(
      {
        reviews: { averageRating: 4.2 },
        marketIntel: { searchVolume: "medium", riskScore: 25 },
        listing: { title: "Optimized Listing Title" },
      },
      { enrichFail: true }
    );
    seedProduct();
    installDetailImpl();
    render(<ProductDetailPage />);

    expect(await screen.findByText("Failed to load price data")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load review data")).not.toBeInTheDocument();

    setDetailEnv({ enrich: RICH_ENRICH });
    installDetailImpl();
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    expect(await screen.findByText("Optimized Listing Title")).toBeInTheDocument();
    expect(screen.getByText("Risk: 25/100")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load price data")).not.toBeInTheDocument();

    await settle();
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EnrichedProductCard, { type EnrichedProduct } from "./EnrichedProductCard";

const routerState = vi.hoisted(() => ({ push: vi.fn() }));
const safeFetchMock = vi.hoisted(() => vi.fn());
const savedState = vi.hoisted(() => ({ isSaved: vi.fn(), toggleSave: vi.fn() }));
const trackingState = vi.hoisted(() => ({
  trackClick: vi.fn(),
  trackSearch: vi.fn(),
  trackSave: vi.fn(),
  trackView: vi.fn(),
  trackCompare: vi.fn(),
  getPersonalizationProfile: vi.fn().mockResolvedValue({}),
}));
const authState = vi.hoisted(() => ({ user: null as null | { uid: string } }));

vi.mock("next/image", () => ({
  default: (props: { src?: string; alt?: string; [k: string]: unknown }) => <img src={props.src} alt={props.alt} />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerState.push,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: authState.user }),
}));

vi.mock("@/components/saved/SavedProductsProvider", () => ({
  useSavedProducts: () => ({
    isSaved: savedState.isSaved,
    toggleSave: savedState.toggleSave,
    savedProducts: [],
  }),
}));

vi.mock("@/components/fulfillment/SupplierPicker", () => ({
  SupplierPicker: () => <div data-testid="supplier-picker" />,
}));

vi.mock("@/lib/safe-fetch", () => ({ safeFetch: safeFetchMock }));

vi.mock("@/contexts/SearchTrackingContext", () => ({
  useSearchTracking: () => trackingState,
}));

const connectedStore = {
  id: "s1",
  platform: "shopify",
  name: "Shopify Store",
  url: "https://myshop.com",
  status: "connected",
};

function makeProduct(overrides: Record<string, unknown> = {}): EnrichedProduct {
  return {
    id: "prod-1",
    title: "Wireless Headphones",
    price: 29.99,
    image: "https://example.com/headphones.jpg",
    images: ["https://example.com/headphones.jpg", "https://example.com/headphones2.jpg"],
    link: "https://amazon.com/dp/B0TEST",
    source: "amazon",
    rating: 4.5,
    reviews: 1234,
    ...overrides,
  } as unknown as EnrichedProduct;
}

beforeEach(() => {
  routerState.push.mockClear();
  safeFetchMock.mockReset().mockResolvedValue({});
  savedState.isSaved.mockClear().mockReturnValue(false);
  savedState.toggleSave.mockClear();
  trackingState.trackClick.mockClear();
  authState.user = null;
  sessionStorage.clear();
  localStorage.clear();
  vi.spyOn(window, "open").mockImplementation(() => null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EnrichedProductCard", () => {
  it("renders product title", () => {
    render(<EnrichedProductCard product={makeProduct()} index={0} />);
    expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
  });

  it("displays price", () => {
    render(<EnrichedProductCard product={makeProduct()} index={0} />);
    expect(screen.getByText("$29.99")).toBeInTheDocument();
  });

  it("shows Price N/A when price is null", () => {
    render(<EnrichedProductCard product={makeProduct({ price: null })} index={0} />);
    expect(screen.getByText("Price N/A")).toBeInTheDocument();
  });

  it("navigates to the detail page and reports the click", () => {
    const onProductClick = vi.fn();
    render(<EnrichedProductCard product={makeProduct()} index={0} onProductClick={onProductClick} />);

    fireEvent.click(screen.getByRole("link", { name: "Wireless Headphones" }));

    expect(routerState.push).toHaveBeenCalledWith(
      expect.stringContaining("/products/prod-1?")
    );
    const calledWith = routerState.push.mock.calls[0][0] as string;
    expect(calledWith).toContain("t=Wireless+Headphones");
    expect(calledWith).toContain("src=amazon");
    expect(calledWith).toContain("p=29.99");
    expect(calledWith).toContain("r=4.5");
    expect(calledWith).toContain("rev=1234");
    expect(trackingState.trackClick).toHaveBeenCalledWith("prod-1", "", "amazon");
    expect(onProductClick).toHaveBeenCalled();
    const stored = JSON.parse(sessionStorage.getItem("selectedProduct") || "{}");
    expect(stored.id).toBe("prod-1");
  });

  it("toggles selection instead of navigating in compare mode", () => {
    const onToggleSelect = vi.fn();
    render(
      <EnrichedProductCard
        product={makeProduct()}
        index={0}
        compareMode
        selected={false}
        onToggleSelect={onToggleSelect}
      />
    );

    fireEvent.click(screen.getByRole("link", { name: "Wireless Headphones" }));

    expect(onToggleSelect).toHaveBeenCalledWith("prod-1");
    expect(routerState.push).not.toHaveBeenCalled();
  });

  it("saves the product to favorites with the full payload", () => {
    render(<EnrichedProductCard product={makeProduct()} index={0} />);
    fireEvent.click(screen.getByTitle("Save to favorites"));

    expect(savedState.toggleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "prod-1",
        title: "Wireless Headphones",
        price: 29.99,
        image: "https://example.com/headphones.jpg",
        link: "https://amazon.com/dp/B0TEST",
        source: "amazon",
        rating: 4.5,
        reviews: 1234,
      })
    );
  });

  it("shows the saved heart state when the product is already favorited", () => {
    savedState.isSaved.mockReturnValue(true);
    render(<EnrichedProductCard product={makeProduct()} index={0} />);
    expect(screen.getByTitle("Remove from favorites")).toBeInTheDocument();
  });

  it("selects the product for quick actions when asked", () => {
    const onSelectForActions = vi.fn();
    const { rerender } = render(
      <EnrichedProductCard product={makeProduct()} index={0} onSelectForActions={onSelectForActions} />
    );

    fireEvent.click(screen.getByTitle("Select product for actions"));
    expect(onSelectForActions).toHaveBeenCalledWith("prod-1");

    rerender(
      <EnrichedProductCard product={makeProduct()} index={0} onSelectForActions={onSelectForActions} selectedForActions />
    );
    expect(screen.getByTitle("Deselect product")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Deselect product"));
    expect(onSelectForActions).toHaveBeenCalledTimes(2);
  });

  it("opens the AI actions menu and dispatches the analyze action", () => {
    const onAIAction = vi.fn();
    render(<EnrichedProductCard product={makeProduct()} index={0} onAIAction={onAIAction} />);

    fireEvent.click(screen.getByTitle("AI Actions"));
    expect(screen.getByText("Find Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Generate Listing")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Analyze Product"));
    expect(onAIAction).toHaveBeenCalledWith("analyze", expect.objectContaining({ id: "prod-1" }));
  });

  it("passes the validate action through the AI menu", () => {
    const onAIAction = vi.fn();
    render(<EnrichedProductCard product={makeProduct()} index={0} onAIAction={onAIAction} />);
    fireEvent.click(screen.getByTitle("AI Actions"));
    fireEvent.click(screen.getByText("Validate Product"));
    expect(onAIAction).toHaveBeenCalledWith("validate", expect.objectContaining({ id: "prod-1" }));
  });

  it("pushes a product to a connected store", async () => {
    authState.user = { uid: "u1" };
    safeFetchMock
      .mockResolvedValueOnce({ connections: [connectedStore] })
      .mockResolvedValueOnce({ success: true });
    render(<EnrichedProductCard product={makeProduct()} index={0} />);

    fireEvent.click(screen.getByText("Push"));
    expect(screen.getByRole("dialog", { name: "Push to Store" })).toBeInTheDocument();

    const storeButton = await screen.findByText("Shopify Store");
    fireEvent.click(storeButton);

    await waitFor(() => {
      expect(safeFetchMock).toHaveBeenCalledWith(
        "/api/store/push",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"storeId":"s1"'),
        })
      );
    });
    expect(await screen.findByText(/Pushed to Shopify Store!/)).toBeInTheDocument();
  });

  it("offers to connect a store when no stores are connected", async () => {
    authState.user = { uid: "u1" };
    safeFetchMock.mockResolvedValueOnce({ connections: [] });
    render(<EnrichedProductCard product={makeProduct()} index={0} />);

    fireEvent.click(screen.getByText("Push"));
    expect(await screen.findByText("No stores connected yet")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Connect a Store"));
    expect(routerState.push).toHaveBeenCalledWith("/store");
  });

  it("does not fetch stores when the user is signed out", () => {
    render(<EnrichedProductCard product={makeProduct()} index={0} />);
    fireEvent.click(screen.getByText("Push"));

    expect(screen.getByRole("dialog", { name: "Push to Store" })).toBeInTheDocument();
    expect(screen.getByText("No stores connected yet")).toBeInTheDocument();
    expect(safeFetchMock).not.toHaveBeenCalled();
  });

  it("surfaces a push failure message", async () => {
    authState.user = { uid: "u1" };
    safeFetchMock
      .mockResolvedValueOnce({ connections: [connectedStore] })
      .mockRejectedValueOnce(new Error("Network error"));
    render(<EnrichedProductCard product={makeProduct()} index={0} />);

    fireEvent.click(screen.getByText("Push"));
    fireEvent.click(await screen.findByText("Shopify Store"));

    expect(await screen.findByText(/Network error/)).toBeInTheDocument();
  });

  it("opens product validation with serialized product data", () => {
    const product = makeProduct({
      brand: "Sony",
      goldenScore: 87,
      trendPhase: "growth",
      saturationLevel: "saturated",
      competitorCount: 4,
      estimatedMargin: 40,
      platforms: [{ platform: "ebay", price: 25, link: "https://ebay.com/1" }],
    });
    render(<EnrichedProductCard product={product} index={0} />);

    fireEvent.click(screen.getByText("Validate"));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("/product-validation?"),
      "_blank"
    );
    const url = (window.open as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("productTitle=Wireless+Headphones");
    expect(url).toContain("currentPrice=29.99");
    expect(url).toContain("brand=Sony");
    expect(url).toContain("competitorCount=4");
    expect(url).toContain("existingGoldenScore=87");
    expect(url).toContain("estimatedMargin=40");
    expect(url).toContain("trendPhase=growth");
    expect(url).toContain("saturationLevel=saturated");
    expect(url).toContain("platformPrices=");
  });

  it("opens the sample tab when Sample is clicked", () => {
    render(<EnrichedProductCard product={makeProduct()} index={0} />);
    fireEvent.click(screen.getByText("Sample"));
    expect(window.open).toHaveBeenCalledWith("/products/prod-1?tab=sample", "_blank");
  });

  it("saves a private note to localStorage", () => {
    render(<EnrichedProductCard product={makeProduct()} index={0} />);
    fireEvent.click(screen.getByTitle("Add note"));

    const textarea = screen.getByPlaceholderText("Add private notes about this product...");
    fireEvent.change(textarea, { target: { value: "Great margins" } });
    fireEvent.click(screen.getByText("Save"));

    const notes = JSON.parse(localStorage.getItem("productNotes") || "{}");
    expect(notes["prod-1"]).toBe("Great margins");
    expect(screen.queryByPlaceholderText("Add private notes about this product...")).not.toBeInTheDocument();
  });

  it("renders enrichment badges when data is present", () => {
    render(
      <EnrichedProductCard
        product={makeProduct({
          goldenRank: "A",
          goldenScore: 87,
          trendPhase: "growth",
          saturationLevel: "low",
          platformCount: 3,
        })}
        index={0}
      />
    );
    expect(screen.getByText("A (87)")).toBeInTheDocument();
    expect(screen.getByText("Growing")).toBeInTheDocument();
    expect(screen.getByText("Low Sat")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("shows the margin badge and estimated profit when margin exists and no rank or phase", () => {
    render(
      <EnrichedProductCard
        product={makeProduct({ estimatedMargin: 40 })}
        index={0}
      />
    );
    expect(screen.getByText("~40%")).toBeInTheDocument();
    expect(screen.getByText(/12 profit/)).toBeInTheDocument();
  });

  it("renders shipping and stock indicators", () => {
    render(
      <EnrichedProductCard
        product={makeProduct({ shippingDays: 5, inStock: true, competitorCount: 4 })}
        index={0}
      />
    );
    expect(screen.getByText("5d")).toBeInTheDocument();
    expect(screen.getByText("In Stock")).toBeInTheDocument();
    expect(screen.getByText("4 sellers")).toBeInTheDocument();
  });

  it("renders the out-of-stock indicator", () => {
    render(<EnrichedProductCard product={makeProduct({ shippingDays: 5, inStock: false })} index={0} />);
    expect(screen.getByText("Out of Stock")).toBeInTheDocument();
  });
});
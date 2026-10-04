import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProductValidationPage from "./ProductValidationPage";

const searchParamsState = vi.hoisted(() => ({ current: "" }));

vi.mock("lucide-react", () => ({
  Loader2: () => <div data-testid="loader" />,
  Sparkles: () => <div data-testid="sparkles" />,
  ChevronDown: () => <div data-testid="chevron-down" />,
  ChevronUp: () => <div data-testid="chevron-up" />,
  RotateCcw: () => <div data-testid="rotate-ccw" />,
  Clock: () => <div data-testid="clock" />,
  Trophy: () => <div data-testid="trophy" />,
  Star: () => <div data-testid="star" />,
  AlertCircle: () => <div data-testid="alert-circle" />,
  CheckCircle2: () => <div data-testid="check-circle" />,
  XCircle: () => <div data-testid="x-circle" />,
  TrendingUp: () => <div data-testid="trending-up" />,
  TrendingDown: () => <div data-testid="trending-down" />,
  Minus: () => <div data-testid="minus" />,
  Zap: () => <div data-testid="zap" />,
  AlertTriangle: () => <div data-testid="alert-triangle" />,
  Users: () => <div data-testid="users" />,
  ShieldCheck: () => <div data-testid="shield-check" />,
  ShieldAlert: () => <div data-testid="shield-alert" />,
  ShieldX: () => <div data-testid="shield-x" />,
  DollarSign: () => <div data-testid="dollar-sign" />,
  Calendar: () => <div data-testid="calendar" />,
  Package: () => <div data-testid="package" />,
  Truck: () => <div data-testid="truck" />,
  AlertOctagon: () => <div data-testid="alert-octagon" />,
  Globe: () => <div data-testid="globe" />,
  ShoppingCart: () => <div data-testid="shopping-cart" />,
  BarChart3: () => <div data-testid="bar-chart-3" />,
  ArrowUpRight: () => <div data-testid="arrow-up-right" />,
  Layers: () => <div data-testid="layers" />,
  Download: () => <div data-testid="download" />,
  FileText: () => <div data-testid="file-text" />,
  Copy: () => <div data-testid="copy" />,
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn().mockReturnValue({ data: null }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(searchParamsState.current),
}));

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
}));

const mockFetch = vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({}) });
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: Record<string, unknown>) {
  return { ok: true, json: vi.fn().mockResolvedValue(data) };
}

describe("ProductValidationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsState.current = "";
    mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue({}) });
  });

  it("renders page title", () => {
    render(<ProductValidationPage />);
    expect(screen.getByText("Product Validation Engine")).toBeInTheDocument();
  });

  it("renders page description", () => {
    render(<ProductValidationPage />);
    expect(screen.getByText(/Score products with deterministic scoring/)).toBeInTheDocument();
  });

  it("does not claim AI-powered analysis", () => {
    render(<ProductValidationPage />);
    expect(screen.queryByText(/AI-Powered Analysis/)).not.toBeInTheDocument();
    expect(screen.getByText("Rule-Based Analysis")).toBeInTheDocument();
  });

  it("renders Run Validation button", () => {
    render(<ProductValidationPage />);
    const validateButton = screen.getByRole("button", { name: "Validate" });
    const actionGroup = screen.getByRole("group", { name: "Validation actions" });
    expect(screen.getAllByRole("button", { name: "Validate" })).toHaveLength(1);
    expect(actionGroup).toContainElement(validateButton);
    const firstFieldPanel = screen.getByText("Product Source").closest("section");
    expect(actionGroup.compareDocumentPosition(firstFieldPanel!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(actionGroup).toHaveClass("sticky", "top-16");
    expect(actionGroup.parentElement).toHaveClass("space-y-3");
    expect(screen.getByText("Ready to Validate").closest(".glass")).not.toContainElement(actionGroup);
  });

  it("renders reset button", () => {
    render(<ProductValidationPage />);
    expect(screen.getByTestId("rotate-ccw")).toBeInTheDocument();
  });

  it("renders default empty state", () => {
    render(<ProductValidationPage />);
    expect(screen.getByText("Ready to Validate")).toBeInTheDocument();
  });

  it("renders engine tags", () => {
    render(<ProductValidationPage />);
    const tags = screen.getAllByText("Trend Velocity");
    expect(tags.length).toBeGreaterThanOrEqual(1);
    const saturationTags = screen.getAllByText("Profit Potential");
    expect(saturationTags.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Basic Info section open by default", () => {
    render(<ProductValidationPage />);
    expect(screen.getByText("Product Title *")).toBeInTheDocument();
  });

  it("renders collapsible sections", () => {
    render(<ProductValidationPage />);
    const trendVelocity = screen.getAllByText("Trend Velocity");
    expect(trendVelocity.length).toBeGreaterThanOrEqual(1);
  });

  it("shows validation error when title is empty and button clicked", () => {
    render(<ProductValidationPage />);
    const button = screen.getByText("Validate").closest("button")!;
    expect(button).toBeDisabled();
  });

  it("renders form sections", () => {
    render(<ProductValidationPage />);
    const saturation = screen.getAllByText("Market Saturation");
    expect(saturation.length).toBeGreaterThanOrEqual(1);
    const profit = screen.getAllByText("Profit Model");
    expect(profit.length).toBeGreaterThanOrEqual(1);
    const seasonal = screen.getAllByText("Seasonal Data");
    expect(seasonal.length).toBeGreaterThanOrEqual(1);
    const metricsGrid = screen.getByText("Demand & Trend").parentElement?.parentElement?.parentElement;
    expect(metricsGrid).toHaveClass("grid", "grid-cols-1", "md:grid-cols-2", "xl:grid-cols-4");
    expect(screen.getByText("Demand & Trend").closest("section")).toHaveClass("xl:col-span-3");
    const sourcePanel = screen.getByText("Product Source").closest("section");
    const saturationPanel = screen.getByText("Market Saturation").closest("section");
    expect(sourcePanel?.parentElement).toBe(saturationPanel?.parentElement);
    expect(sourcePanel?.parentElement).toHaveClass("space-y-2");
  });

  it("enables button when title is entered", () => {
    render(<ProductValidationPage />);
    const input = screen.getByPlaceholderText("e.g. Wireless Bluetooth Earbuds");
    fireEvent.change(input, { target: { value: "Test Product" } });
    const button = screen.getByText("Validate").closest("button")!;
    expect(button).not.toBeDisabled();
  });

  it("prefills and fetches product context across validation tabs", async () => {
    searchParamsState.current = new URLSearchParams({
      productTitle: "Smart Home Speaker",
      source: "amazon",
      currentPrice: "29.99",
      productCost: "29.99",
      estimatedSellingPrice: "65.98",
      productImage: "https://img.example.com/speaker.jpg",
      productUrl: "https://amazon.com/dp/B012345678",
      category: "Electronics",
      rating: "4.5",
      reviews: "420",
      searchInterestIndex: "68",
      historicalInterestIndex: "12,24,43,68",
      historicalPrices: "34,32,31",
      supplierName: "Context Supplier",
      supplierReliability: "90",
      competitorCount: "18",
      platformPrices: JSON.stringify([
        { platform: "Amazon", title: "Smart Home Speaker Plus", price: 24.5, rating: 4.6, reviews: 800 },
        { platform: "eBay", title: "Compact Smart Speaker", price: 27, rating: 4.3, reviews: 300 },
      ]),
    }).toString();
    mockFetch.mockImplementation((input: unknown) => {
      const url = String(input);
      if (url.startsWith("/api/suppliers/find")) {
        return Promise.resolve(jsonResponse({ suppliers: [{
          id: "supplier-1",
          name: "Fetched Supplier",
          stats: {
            reliabilityScore: 94,
            rating: 4.8,
            shippingDays: 6,
            responseTime: "2h",
            refundRate: 1,
            orderCompletionRate: 97,
            communicationScore: 89,
          },
          yearsInBusiness: 12,
          sourceUrl: "https://supplier.example.com",
          shipping: { methods: ["standard", "express"] },
          quality: { certifications: ["ISO 9001"] },
          catalog: { categories: ["Electronics"], priceRange: { min: 5, max: 50 }, moq: 2, samplesAvailable: true },
        }] }));
      }
      if (url === "/api/products/enrich") {
        return Promise.resolve(jsonResponse({
          platforms: [
            { platform: "Amazon", title: "Smart Home Speaker Plus", price: 24.5, rating: 4.6, reviews: 800, url: "https://amazon.com/item", brand: "Acme" },
            { platform: "eBay", title: "Compact Smart Speaker", price: 27, rating: 4.3, reviews: 300, url: "https://ebay.com/item" },
          ],
          supplierMatches: [],
        }));
      }
      if (url === "/api/products/market-intel") {
        return Promise.resolve(jsonResponse({
          searchVolume: "medium",
          interestIndex: 75,
          trendSparkline: [10, 20, 45, 75],
          trendDirection: "rising",
          competitionLevel: "high",
          estimatedSellers: 22,
          avgSellerRating: 4.4,
          meta: { status: "live" },
        }));
      }
      return Promise.resolve(jsonResponse({}));
    });

    render(<ProductValidationPage />);

    expect(await screen.findByDisplayValue("Smart Home Speaker")).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("29.99").length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("65.98")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByDisplayValue("75")).toBeInTheDocument());
    expect(screen.getByDisplayValue("10, 20, 45, 75")).toBeInTheDocument();
    expect(screen.getByDisplayValue("34,32,31")).toBeInTheDocument();
    expect(screen.getByDisplayValue("24.5")).toBeInTheDocument();
    expect(screen.getByDisplayValue("27")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Product Details" }));
    await waitFor(() => expect(screen.getByDisplayValue("Acme")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Supply Chain" }));
    await waitFor(() => expect(screen.getByDisplayValue("Fetched Supplier")).toBeInTheDocument());
    expect(screen.getByDisplayValue("https://supplier.example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("97")).toBeInTheDocument();
    expect(screen.getByDisplayValue("89")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Risk & Market" }));
    expect(screen.getByDisplayValue("standard, express")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Product Details" }));
    expect(screen.getByDisplayValue("ISO 9001")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Core Data" }));
    await waitFor(() => expect(screen.getByDisplayValue("75")).toBeInTheDocument());
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/products/enrich", expect.objectContaining({
      body: JSON.stringify({ title: "Smart Home Speaker", source: "amazon", price: 29.99 }),
    })));

    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/product-validation", expect.objectContaining({
      body: expect.stringContaining('"currentSearchInterestIndex":75'),
    })));
    const validationCall = mockFetch.mock.calls.find(([url]) => url === "/api/product-validation");
    const validationBody = JSON.parse(validationCall?.[1]?.body as string);
    expect(validationBody.trendVelocity.historicalSearchInterest).toEqual([10, 20, 45, 75]);
    expect(validationBody.trendVelocity.historicalPrices).toEqual([34, 32, 31]);
    expect(validationBody.productAuthenticity).toMatchObject({
      productTitle: "Smart Home Speaker",
      productImage: "https://img.example.com/speaker.jpg",
      brand: "Acme",
    });
  });
});

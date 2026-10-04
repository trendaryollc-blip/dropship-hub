import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

const mockPush = vi.fn();
const mockGet = vi.fn().mockReturnValue(null);

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
  useRouter: () => ({ push: mockPush }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));
vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn(),
}));
vi.mock("@/components/suppliers/SupplierFilterPanel", () => ({
  default: (props: any) => <div data-testid="filter-panel">FilterPanel</div>,
}));
vi.mock("@/components/suppliers/SupplierComparePanel", () => ({
  default: (props: any) => <div data-testid="compare-panel">ComparePanel</div>,
}));
vi.mock("@/components/suppliers/SupplierCollections", () => ({
  default: () => <div data-testid="collections">Collections</div>,
}));
vi.mock("@/components/suppliers/SupplierAISuggestions", () => ({
  default: () => <div data-testid="ai-suggestions">AISuggestions</div>,
}));
vi.mock("@/components/suppliers/SupplierQuickActions", () => ({
  default: (props: any) => <div data-testid="quick-actions">QuickActions</div>,
}));
vi.mock("@/components/suppliers/SupplierListItem", () => ({
  default: (props: any) => <div data-testid="list-item">{props.supplier.name}</div>,
}));
vi.mock("@/components/suppliers/supplier-shared", () => ({
  badgeConfig: {
    gold: { label: "Gold", color: "text-amber-400", border: "border-amber-400/20" },
    silver: { label: "Silver", color: "text-slate-300", border: "border-slate-300/20" },
    bronze: { label: "Bronze", color: "text-orange-400", border: "border-orange-400/20" },
    unverified: { label: "Unverified", color: "text-zinc-400", border: "border-zinc-400/20" },
  },
  ScoreRing: ({ score }: any) => <div data-testid="score-ring">{score}</div>,
  dataSourceConfig: {
    live: { label: "LIVE DATA", color: "text-emerald-400", description: "" },
    estimated: { label: "ESTIMATED", color: "text-amber-400", description: "" },
  },
}));
vi.mock("lucide-react", () => ({
  Search: (p: any) => <div data-testid="icon-search" />,
  Shield: (p: any) => <div data-testid="icon-shield" />,
  MapPin: (p: any) => <div data-testid="icon-map" />,
  Clock: (p: any) => <div data-testid="icon-clock" />,
  Star: (p: any) => <div data-testid="icon-star" />,
  Filter: (p: any) => <div data-testid="icon-filter" />,
  Truck: (p: any) => <div data-testid="icon-truck" />,
  Package: (p: any) => <div data-testid="icon-package" />,
  ArrowRight: (p: any) => <div data-testid="icon-arrow-right" />,
  RefreshCw: (p: any) => <div data-testid="icon-refresh" />,
  CheckSquare: (p: any) => <div data-testid="icon-check-square" />,
  Square: (p: any) => <div data-testid="icon-square" />,
  X: (p: any) => <div data-testid="icon-x" />,
  Sparkles: (p: any) => <div data-testid="icon-sparkles" />,
  TrendingUp: (p: any) => <div data-testid="icon-trending" />,
  BarChart3: (p: any) => <div data-testid="icon-chart" />,
  MessageSquare: (p: any) => <div data-testid="icon-message" />,
  FileText: (p: any) => <div data-testid="icon-file" />,
  Layers: (p: any) => <div data-testid="icon-layers" />,
  Loader2: (p: any) => <div data-testid="icon-loader" />,
  Globe: (p: any) => <div data-testid="icon-globe" />,
  ExternalLink: (p: any) => <div data-testid="icon-external" />,
  Zap: (p: any) => <div data-testid="icon-zap" />,
  Target: (p: any) => <div data-testid="icon-target" />,
  LayoutGrid: (p: any) => <div data-testid="icon-layout-grid" />,
  List: (p: any) => <div data-testid="icon-list" />,
  Check: (p: any) => <div data-testid="icon-check" />,
  AlertCircle: (p: any) => <div data-testid="icon-alert-circle" />,
}));

import SuppliersContent from "./tabs/DiscoverTab";
import { useAPI } from "@/hooks/useAPI";
import type { SupplierProfile } from "@/types/supplier";

const mockSupplier: SupplierProfile = {
  id: "cj-dropshipping",
  name: "CJ Dropshipping",
  slug: "cj-dropshipping",
  location: "Yiwu, China",
  country: "China",
  flag: "\ud83c\udde8\ud83c\uddf3",
  description: "CJ Dropshipping description",
  specializations: ["Electronics", "Fashion"],
  trustBadge: "gold",
  dataSource: "live",
  stats: {
    reliabilityScore: 87, rating: 4.5, reviews: 28000, responseTime: "< 8 hours",
    responseTimeHours: 8, shippingDays: 7, shippingDaysEU: 10, orderCompletionRate: 96.8,
    disputeRate: 1.8, monthlyOrders: 89000, totalProducts: 50000, yearEstablished: 2014,
    communicationScore: 82, qualityScore: 83, priceCompetitiveness: 97,
  },
  shipping: { methods: ["CJPacket"], processingTime: "1-3 days", freeShippingThreshold: 500, packagingQuality: "premium" },
  quality: { inspection: "Free", returnPolicy: "30 days", refundPolicy: "Full", replacementPolicy: "Free", disputeResolution: "24-48h", certifications: ["ISO 9001"] },
  catalog: { categories: ["Electronics"], priceRange: { min: 0.5, max: 200 }, moq: 1, samplesAvailable: true, samplePrice: 10 },
  communication: { methods: ["Live Chat"], languages: ["English"], supportHours: "24/7" },
  source: "cj", sourceUrl: "https://cjdropshipping.com", lastUpdated: new Date().toISOString(),
};

describe("SuppliersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null);
    sessionStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ platforms: [] }),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders loading state", () => {
    (useAPI as any).mockReturnValue({ data: null, error: null, isLoading: true, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("Loading supplier data...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    (useAPI as any).mockReturnValue({ data: null, error: "API Error", isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getAllByText("Failed to load suppliers").length).toBeGreaterThan(0);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders empty state when no suppliers", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("No suppliers match your filters")).toBeInTheDocument();
  });

  it("renders hero title", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("1 supplier found")).toBeInTheDocument();
  });

  it("renders hero search bar", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByPlaceholderText(/Search suppliers by name/)).toBeInTheDocument();
  });

  it("renders Ask AI button", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("Ask AI")).toBeInTheDocument();
  });

  it("opens AI search panel when Ask AI is clicked", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    fireEvent.click(screen.getByText("Ask AI"));
    expect(screen.getByText("Supplier Search")).toBeInTheDocument();
  });

  it("renders Filters button", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("renders sort dropdown", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("Top Rated")).toBeInTheDocument();
  });

  it("renders supplier cards", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("CJ Dropshipping")).toBeInTheDocument();
  });

  it("renders supplier count", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("1 supplier found")).toBeInTheDocument();
  });

  it("renders supplier card with trust badge", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("Gold")).toBeInTheDocument();
  });

  it("renders supplier card with data source badge", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("LIVE DATA")).toBeInTheDocument();
  });

  it("renders supplier card with reliability score", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("renders supplier card with rating", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("renders supplier card with reviews count", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("28,000 reviews")).toBeInTheDocument();
  });

  it("renders supplier card with shipping days", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("7d shipping")).toBeInTheDocument();
  });

  it("renders supplier card with response time", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("< 8 hours")).toBeInTheDocument();
  });

  it("renders supplier card with specializations", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Fashion")).toBeInTheDocument();
  });

  it("renders supplier card with free shipping threshold", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("Free ship $500+")).toBeInTheDocument();
  });

  it("renders supplier card with total products", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("50,000 products")).toBeInTheDocument();
  });

  it("renders supplier link to detail page", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    const link = screen.getByText("CJ Dropshipping").closest("a");
    expect(link).toHaveAttribute("href", "/suppliers/cj-dropshipping");
  });

  it("opens AI panel with placeholder text", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    fireEvent.click(screen.getByText("Ask AI"));
    expect(screen.getByPlaceholderText(/Describe what supplier you need/)).toBeInTheDocument();
  });

  it("Ask AI Enter filters suppliers on the same page without opening a new window", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const toySupplier: SupplierProfile = {
      ...mockSupplier,
      id: "toy-world",
      name: "Toy World Trading",
      slug: "toy-world",
      specializations: ["Toys", "Baby & Kids"],
    };
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier, toySupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);

    fireEvent.click(screen.getByText("Ask AI"));
    const aiInput = screen.getByPlaceholderText(/Describe what supplier you need/);
    fireEvent.change(aiInput, { target: { value: "find reliable suppliers for baby toys" } });
    fireEvent.keyDown(aiInput, { key: "Enter" });

    await waitFor(() => expect(screen.getByText("1 supplier found")).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText("Toy World Trading")).toBeInTheDocument();
    expect(screen.queryByText("CJ Dropshipping")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search suppliers by name/)).toHaveValue("find reliable suppliers for baby toys");
    expect(openSpy).not.toHaveBeenCalled();

    openSpy.mockRestore();
  });

  it("Ask AI shows an explicit empty state when nothing matches", async () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);

    fireEvent.click(screen.getByText("Ask AI"));
    const aiInput = screen.getByPlaceholderText(/Describe what supplier you need/);
    fireEvent.change(aiInput, { target: { value: "organic baby strollers" } });
    fireEvent.keyDown(aiInput, { key: "Enter" });

    await waitFor(() => expect(screen.getByText("No suppliers match \u201Corganic baby strollers\u201D")).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByPlaceholderText(/Search suppliers by name/)).toHaveValue("organic baby strollers");
  });

  it("renders discovery section when no suppliers", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByTestId("ai-suggestions")).toBeInTheDocument();
    expect(screen.getByTestId("collections")).toBeInTheDocument();
  });

  it("renders QuickActions when suppliers exist", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByTestId("quick-actions")).toBeInTheDocument();
  });

  it("retry button calls mutate", () => {
    const mutate = vi.fn();
    (useAPI as any).mockReturnValue({ data: null, error: "Error", isLoading: false, mutate });
    render(<SuppliersContent />);
    fireEvent.click(screen.getByText("Retry"));
    expect(mutate).toHaveBeenCalled();
  });

  it("search input updates filter state", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    const input = screen.getByPlaceholderText(/Search suppliers by name/);
    fireEvent.change(input, { target: { value: "test" } });
    expect(input).toHaveValue("test");
  });

  it("clear search button clears input", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    const input = screen.getByPlaceholderText(/Search suppliers by name/);
    fireEvent.change(input, { target: { value: "test" } });
    const clearBtn = screen.getAllByTestId("icon-x")[0];
    fireEvent.click(clearBtn);
    expect(input).toHaveValue("");
  });

  it("renders price competitiveness bar", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("97%")).toBeInTheDocument();
  });

  it("renders monthly orders", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("89,000 orders/mo")).toBeInTheDocument();
  });

  it("renders supplier initials in avatar", () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    expect(screen.getByText("CD")).toBeInTheDocument();
  });

  it("renders compare button when 2+ suppliers selected", () => {
    const suppliers = [
      mockSupplier,
      { ...mockSupplier, id: "s2", name: "Supplier 2" },
    ];
    (useAPI as any).mockReturnValue({ data: { suppliers }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);
    const checkboxes = screen.getAllByTestId("icon-square");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    expect(screen.getByText(/Compare 2 Suppliers/)).toBeInTheDocument();
  });

  const discoveredSupplier: SupplierProfile = {
    ...mockSupplier,
    id: "alibaba-factory-x-store",
    name: "Factory X Store",
    slug: "alibaba-factory-x-store",
    location: "Unknown",
    country: "",
    flag: "\u{1F310}",
    description: "Storefront on Alibaba, surfaced by live search for baby toys.",
    specializations: ["baby", "toys"],
    trustBadge: "unverified",
    dataSource: "estimated",
    source: "alibaba",
    sourceUrl: "https://www.alibaba.com/store/123",
    stats: {
      ...mockSupplier.stats,
      reliabilityScore: 0,
      rating: 4.6,
      reviews: 320,
      totalProducts: 2,
      monthlyOrders: 0,
      responseTimeHours: 0,
      shippingDays: 0,
      orderCompletionRate: 0,
      priceCompetitiveness: 0,
    },
    listings: [
      {
        title: "Green Robot Toy Set",
        price: 12.99,
        image: null,
        link: "https://www.alibaba.com/product-detail/green-robot-toy_123.html",
      },
    ],
    matchedQuery: "baby toys",
  };

  function jsonResponse(body: unknown, ok = true) {
    return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
  }

  it("renders platform chips from the status endpoint and toggles selection", async () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    (fetch as any).mockImplementation(async () =>
      jsonResponse({
        platforms: [
          { id: "alibaba", name: "Alibaba", configured: true, method: "scraperapi", source: "env" },
          { id: "cj", name: "CJ Dropshipping", configured: false, method: "official_api", source: "env" },
        ],
      })
    );

    render(<SuppliersContent />);
    const chips = await screen.findByTestId("platform-chips");
    expect(within(chips).getByText("Alibaba")).toBeInTheDocument();
    expect(within(chips).getByText("CJ Dropshipping")).toBeInTheDocument();

    const alibabaButton = within(chips).getByText("Alibaba").closest("button");
    expect(alibabaButton).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(alibabaButton!);
    expect(within(chips).getByText("Alibaba").closest("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("platform search POSTs the query and renders discovered suppliers", async () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    const fetchMock = vi.fn(async (url: unknown, init?: { method?: string; body?: string }) => {
      if (init?.method === "POST") {
        const body = JSON.parse(init.body ?? "{}");
        expect(body.query).toBe("baby toys");
        expect(Array.isArray(body.platforms)).toBe(true);
        expect(body.platforms).toContain("alibaba");
        return jsonResponse({
          suppliers: [discoveredSupplier],
          total: 1,
          discoveredCount: 1,
          keywords: ["baby", "toys"],
          platformErrors: [],
          sources: [{ platform: "alibaba", store: "Factory X Store", listings: 2 }],
        });
      }
      return jsonResponse({
        platforms: [{ id: "alibaba", name: "Alibaba", configured: true, method: "scraperapi", source: "env" }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SuppliersContent />);
    await screen.findByTestId("platform-chips");

    const input = screen.getByPlaceholderText(/Search suppliers by name/);
    fireEvent.change(input, { target: { value: "baby toys" } });
    fireEvent.click(screen.getByLabelText("Search suppliers"));

    await waitFor(() => expect(screen.getByText("Factory X Store")).toBeInTheDocument(), { timeout: 3000 });
    await waitFor(() => expect(screen.getByText("1 supplier found")).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.queryByText("CJ Dropshipping")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/suppliers/search-all",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("uses product-matched platform results instead of the generic directory", async () => {
    mockGet.mockImplementation((key: string) => key === "product" ? "Green Robot Toy Set" : null);
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    const productMatch = {
      ...discoveredSupplier,
      specializations: ["green", "robot", "toy", "set"],
      listings: [
        { title: "Green Robot Toy Set", price: 12.99, image: null, link: "https://www.alibaba.com/product-detail/green-robot-toy_123.html" },
      ],
    };
    vi.stubGlobal("fetch", vi.fn(async (_url: unknown, init?: { method?: string }) => {
      if (init?.method === "POST") {
        return jsonResponse({
          suppliers: [productMatch],
          total: 1,
          platformErrors: [],
          sources: [{ platform: "alibaba", store: "Factory X Store", listings: 1 }],
        });
      }
      return jsonResponse({
        platforms: [{ id: "alibaba", name: "Alibaba", configured: true }],
      });
    }));

    render(<SuppliersContent />);

    expect(await screen.findByText("Factory X Store")).toBeInTheDocument();
    expect(screen.getAllByText("Green Robot Toy Set").length).toBeGreaterThan(1);
    expect(screen.queryByText("CJ Dropshipping")).not.toBeInTheDocument();
    expect(useAPI).toHaveBeenCalledWith(null);
  });

  it("shows platform progress while the search is running", async () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    let resolvePost: (value: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });
    (fetch as any).mockImplementation(async (_url: unknown, init?: { method?: string }) => {
      if (init?.method === "POST") return pending;
      return jsonResponse({
        platforms: [{ id: "alibaba", name: "Alibaba", configured: true, method: "scraperapi", source: "env" }],
      });
    });

    render(<SuppliersContent />);
    await screen.findByTestId("platform-chips");

    const input = screen.getByPlaceholderText(/Search suppliers by name/);
    fireEvent.change(input, { target: { value: "wireless earbuds" } });
    fireEvent.click(screen.getByLabelText("Search suppliers"));

    expect(await screen.findByText("Searching platforms...")).toBeInTheDocument();

    resolvePost(
      jsonResponse({
        suppliers: [],
        total: 0,
        discoveredCount: 0,
        keywords: ["wireless", "earbuds"],
        platformErrors: [],
        sources: [],
      })
    );
    await waitFor(() => expect(screen.queryByText("Searching platforms...")).not.toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it("shows a per-platform error chip when a platform fails", async () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    (fetch as any).mockImplementation(async (_url: unknown, init?: { method?: string }) => {
      if (init?.method === "POST") {
        return jsonResponse({
          suppliers: [],
          total: 0,
          discoveredCount: 0,
          keywords: ["toys"],
          platformErrors: [
            { platform: "alibaba", name: "Alibaba", error: "ScraperAPI is not configured. Get a key and set SCRAPER_API_KEYS." },
          ],
          sources: [],
        });
      }
      return jsonResponse({
        platforms: [{ id: "alibaba", name: "Alibaba", configured: false, method: "scraperapi", source: "env" }],
      });
    });

    render(<SuppliersContent />);
    await screen.findByTestId("platform-chips");

    const input = screen.getByPlaceholderText(/Search suppliers by name/);
    fireEvent.change(input, { target: { value: "toys" } });
    fireEvent.click(screen.getByLabelText("Search suppliers"));

    const errors = await screen.findByTestId("platform-errors", {}, { timeout: 3000 });
    expect(within(errors).getByText(/ScraperAPI is not configured/)).toBeInTheDocument();
  });

  it("switches between list and grid views", async () => {
    (useAPI as any).mockReturnValue({ data: { suppliers: [mockSupplier] }, error: null, isLoading: false, mutate: vi.fn() });
    render(<SuppliersContent />);

    fireEvent.click(screen.getByLabelText("Grid view"));
    const grid = screen.getByTestId("supplier-grid");
    expect(grid).toBeInTheDocument();
    expect(within(grid).getAllByText("CJ Dropshipping").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText("List view"));
    expect(screen.queryByTestId("supplier-grid")).not.toBeInTheDocument();
  });

  it("links discovered suppliers to their external store in a new tab", async () => {
    (useAPI as any).mockReturnValue({
      data: { suppliers: [discoveredSupplier] },
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    });
    render(<SuppliersContent />);

    const link = screen.getByText("Factory X Store").closest("a");
    expect(link).toHaveAttribute("href", "https://www.alibaba.com/store/123");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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
}));

import SuppliersContent from "../suppliers/page";
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
    expect(screen.getByText("Supplier Intelligence")).toBeInTheDocument();
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
    expect(screen.getByText("AI-Powered Supplier Search")).toBeInTheDocument();
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
});

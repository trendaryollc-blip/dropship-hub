import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardHome from "./page";
import * as useDashboardDataModule from "@/hooks/useDashboardData";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img alt={props.alt} src={props.src} />,
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "test@test.com", displayName: "TestUser", getIdToken: vi.fn().mockResolvedValue("token") },
  }),
}));

vi.mock("@/components/saved/SavedProductsProvider", () => ({
  useSavedProducts: () => ({
    toggleSave: vi.fn(),
    isSaved: () => false,
  }),
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/hooks/useAnimatedCounter", () => ({
  useAnimatedCounter: (end: number) => end,
}));

vi.mock("@/hooks/useContextualActions", () => ({
  setContextualActions: vi.fn(),
  useContextualActions: () => [],
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: null, mutate: vi.fn() }),
}));

const defaultData = {
  ticker: [
    { name: "Product A", platform: "AliExpress", price: 29.99, change: 5.2, sparkline: [10, 20, 15, 25, 30] },
    { name: "Product B", platform: "CJ", price: 49.99, change: -3.1, sparkline: [30, 25, 20, 15, 10] },
  ],
  dailyPick: {
    title: "Wireless Earbuds Pro",
    category: "Electronics",
    image: "/test.jpg",
    description: "High quality wireless earbuds with ANC",
    radarScores: { margin: 80, demand: 90, competition: 40, trend: 85, supplier: 75 },
    sourcePrice: 12.50,
    sellPrice: 34.99,
    margin: 64,
    risk: "low" as const,
    reason: "High demand, low competition",
    platform: "AliExpress",
    ordersPerMonth: 15000,
    saturation: 35,
    overallScore: 88,
    earningsPreview: { profitPerOrder: 22.49, ordersPerMonth: 500, monthlyRevenue: 11245 },
    reasonPoints: ["High demand trend", "Low saturation", "Strong profit margin"],
    sourceUrl: "https://example.com/product",
    expiresAt: "2026-09-20",
    yesterdayPick: { title: "Yesterday", result: "+12%", up: true },
  },
  briefing: {
    insights: ["Electronics trending up", "Q4 approaching"],
    sentiment: 72,
    sentimentLabel: "Bullish",
    opportunities: 5,
    risks: 2,
    trends: 8,
    lastScan: "2026-09-11",
  },
  alerts: [
    { id: "a1", type: "opportunity" as const, title: "Price drop detected", description: "", action: "View", actionHref: "/monitoring", timestamp: "2h ago", read: false, confidence: 90, aiAnalysis: "", sparkline: [] },
    { id: "a2", type: "risk" as const, title: "Stock low", description: "", action: "View", actionHref: "/monitoring", timestamp: "5h ago", read: true, confidence: 85, aiAnalysis: "", sparkline: [] },
  ],
  suppliers: [
    { name: "Supplier A", trustBadge: "gold" as const, responseTime: "2h", responseLevel: "fast" as const, completionRate: 98, status: "online" as const, rating: 4.9, location: "China" },
    { name: "Supplier B", trustBadge: "silver" as const, responseTime: "8h", responseLevel: "moderate" as const, completionRate: 92, status: "busy" as const, rating: 4.5, location: "Vietnam" },
    { name: "Supplier C", trustBadge: "bronze" as const, responseTime: "24h", responseLevel: "slow" as const, completionRate: 85, status: "offline" as const, rating: 4.0, location: "China" },
  ],
  trending: [
    { name: "Wireless Earbuds", platform: "AliExpress", image: "/earbuds.jpg", price: 12.99, sellPrice: 34.99, profit: 22, margin: 63, trend: 45, sparkline: [10, 20, 30, 40, 50], confidence: 88, whyTrending: "High demand spike", demandLevel: "high" as const, competitionLevel: "low" as const, supplierReliability: 95, monthlyVolume: 5000, shippingDays: "7-12", sourceUrl: "https://example.com", competitors: [{ name: "Competitor X", price: 15.99 }], listingSuggestion: { title: "Test", description: "Test" } },
    { name: "LED Strip Lights", platform: "CJ", image: "/led.jpg", price: 8.50, sellPrice: 24.99, profit: 16.49, margin: 66, trend: 32, sparkline: [5, 15, 25, 35, 20], confidence: 82, whyTrending: "Seasonal trend", demandLevel: "medium" as const, competitionLevel: "medium" as const, supplierReliability: 90, monthlyVolume: 3000, shippingDays: "10-15", sourceUrl: "https://example.com", competitors: [], listingSuggestion: { title: "Test", description: "Test" } },
  ],
  revenueStats: { revenue: 12500, growth: 15.3, orders: 142, avgOrder: 22.50 },
  revenueChart: [{ date: "Sep 1", value: 800 }, { date: "Sep 5", value: 1200 }, { date: "Sep 10", value: 1500 }],
  storesCount: 2,
  fulfillmentPipeline: {
    pending: 5, processing: 3, shipped: 12, delivered: 45,
    totalRevenue: 12500, totalProfit: 3200,
    recentOrders: [
      { id: "o1", customer: "John D.", product: "Wireless Earbuds", status: "pending" as const, amount: 34.99, time: "2h ago" },
      { id: "o2", customer: "Jane S.", product: "LED Strip", status: "shipped" as const, amount: 24.99, time: "5h ago" },
    ],
  },
  heatmap: [
    { category: "Electronics", heat: 85, productCount: 120, avgMargin: 45, trend: "up" as const, weeklyData: [10, 20, 30], topProduct: "Earbuds", topProductMargin: 60, aiInsight: "Hot", velocity: 12 },
    { category: "Home", heat: 65, productCount: 80, avgMargin: 35, trend: "down" as const, weeklyData: [30, 20, 10], topProduct: "Lamp", topProductMargin: 40, aiInsight: "Cooling", velocity: -5 },
    { category: "Fashion", heat: 45, productCount: 60, avgMargin: 55, trend: "stable" as const, weeklyData: [20, 20, 20], topProduct: "Watch", topProductMargin: 50, aiInsight: "Stable", velocity: 0 },
  ],
  healthScore: 78,
  contextualActions: [],
  mission: null,
  niches: [],
  tasks: [],
  actions: [],
  compareItems: [],
  pulse: [],
  actionStats: [],
};

vi.mock("@/hooks/useDashboardData", () => ({
  useDashboardData: vi.fn(() => ({
    data: defaultData,
    loading: false,
    markAlertRead: vi.fn(),
    markAllAlertsRead: vi.fn(),
    addToCompare: vi.fn(),
    removeFromCompare: vi.fn(),
    clearCompare: vi.fn(),
  })),
}));

vi.mock("lucide-react", () => {
  const I = (n: string) => Object.assign((p: any) => null, { displayName: n });
  return {
    DollarSign: I("DollarSign"), ShoppingCart: I("ShoppingCart"), Package: I("Package"),
    TrendingUp: I("TrendingUp"), TrendingDown: I("TrendingDown"), Search: I("Search"),
    Zap: I("Zap"), Activity: I("Activity"), Store: I("Store"), Truck: I("Truck"),
    Bell: I("Bell"), ChevronRight: I("ChevronRight"), Sparkles: I("Sparkles"),
    Target: I("Target"), Shield: I("Shield"), Clock: I("Clock"), CheckCircle2: I("CheckCircle2"),
    Star: I("Star"), BookmarkPlus: I("BookmarkPlus"), BookmarkCheck: I("BookmarkCheck"),
    AlertTriangle: I("AlertTriangle"), Plus: I("Plus"), RefreshCw: I("RefreshCw"),
    ArrowUpRight: I("ArrowUpRight"), Flame: I("Flame"), Minus: I("Minus"),
    BarChart3: I("BarChart3"), Globe: I("Globe"), Users: I("Users"), RotateCcw: I("RotateCcw"),
    Mic: I("Mic"), FileText: I("FileText"), Calculator: I("Calculator"),
    Headphones: I("Headphones"), Map: I("Map"), Layers: I("Layers"), Brain: I("Brain"),
    Crosshair: I("Crosshair"), GitBranch: I("GitBranch"), Award: I("Award"),
    Eye: I("Eye"), ChevronLeft: I("ChevronLeft"), ExternalLink: I("ExternalLink"),
    Info: I("Info"), HeartPulse: I("HeartPulse"), X: I("X"),
  };
});

describe("Dashboard Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
      data: defaultData,
      loading: false,
      markAlertRead: vi.fn(),
      markAllAlertsRead: vi.fn(),
      addToCompare: vi.fn(),
      removeFromCompare: vi.fn(),
      clearCompare: vi.fn(),
    });
  });

  describe("Loading State", () => {
    it("shows skeleton when loading", () => {
      const mockFn = vi.mocked(useDashboardDataModule.useDashboardData);
      mockFn.mockReturnValue({
        data: { suppliers: [], trending: [], heatmap: [], ticker: [], alerts: [], revenueStats: { revenue: 0, growth: 0, orders: 0, avgOrder: 0 }, revenueChart: [], storesCount: 0, healthScore: null, dailyPick: null, briefing: { insights: [], sentiment: 0, sentimentLabel: "", opportunities: 0, risks: 0, trends: 0, lastScan: "" }, fulfillmentPipeline: { pending: 0, processing: 0, shipped: 0, delivered: 0, totalRevenue: 0, totalProfit: 0, recentOrders: [] }, contextualActions: [], mission: null, niches: [], tasks: [], actions: [], compareItems: [], pulse: [], actionStats: [] } as any,
        loading: true, markAlertRead: vi.fn(), markAllAlertsRead: vi.fn(),
        addToCompare: vi.fn(), removeFromCompare: vi.fn(), clearCompare: vi.fn(),
      });
      const { container } = render(<DashboardHome />);
      expect(container.querySelector("[aria-busy='true']")).toBeTruthy();
    });

    it("does not show skeleton when loaded", () => {
      render(<DashboardHome />);
      expect(screen.queryByLabelText("Loading dashboard")).toBeNull();
    });
  });

  describe("Hero Command Center", () => {
    it("renders welcome heading", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Welcome to")).toBeInTheDocument();
      expect(screen.getByText("Dropship Hub")).toBeInTheDocument();
    });

    it("renders user greeting", () => {
      render(<DashboardHome />);
      expect(screen.getByText("TestUser")).toBeInTheDocument();
    });

    it("renders health score value", () => {
      render(<DashboardHome />);
      expect(screen.getByText("78")).toBeInTheDocument();
    });

    it("renders health label for 78", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Needs attention")).toBeInTheDocument();
    });

    it("renders all 4 quick action links", () => {
      render(<DashboardHome />);
      expect(screen.getAllByText("Find Products").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Suppliers").length).toBeGreaterThanOrEqual(1);
      const calcLinks = screen.getAllByText("Calculator");
      expect(calcLinks.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("AI Tools").length).toBeGreaterThanOrEqual(1);
    });

    it("Find Products links to /products", () => {
      render(<DashboardHome />);
      const links = screen.getAllByText("Find Products");
      expect(links[0].closest("a")).toHaveAttribute("href", "/products");
    });

    it("Suppliers links to /suppliers", () => {
      render(<DashboardHome />);
      const links = screen.getAllByText("Suppliers");
      expect(links[0].closest("a")).toHaveAttribute("href", "/suppliers");
    });
  });

  describe("Smart Search Bar", () => {
    it("renders search input", () => {
      render(<DashboardHome />);
      expect(screen.getByPlaceholderText(/Search winning products/)).toBeDefined();
    });

    it("renders Go button", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Go")).toBeDefined();
    });

    it("renders suggested command chips", () => {
      render(<DashboardHome />);
      expect(screen.getByText(/Find winning products under/)).toBeDefined();
      expect(screen.getByText(/High margin products/)).toBeDefined();
      expect(screen.getByText(/Find reliable suppliers/)).toBeDefined();
    });

    it("submit navigates to products page", () => {
      render(<DashboardHome />);
      const input = screen.getByPlaceholderText(/Search winning products/);
      fireEvent.change(input, { target: { value: "wireless earbuds" } });
      fireEvent.submit(input.closest("form")!);
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/products"));
    });

    it("empty search does not navigate", () => {
      render(<DashboardHome />);
      const input = screen.getByPlaceholderText(/Search winning products/);
      fireEvent.submit(input.closest("form")!);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("supplier keyword navigates to suppliers", () => {
      render(<DashboardHome />);
      const input = screen.getByPlaceholderText(/Search winning products/);
      fireEvent.change(input, { target: { value: "find suppliers" } });
      fireEvent.submit(input.closest("form")!);
      expect(mockPush).toHaveBeenCalledWith("/suppliers");
    });

    it("calculator keyword navigates to calculator", () => {
      render(<DashboardHome />);
      const input = screen.getByPlaceholderText(/Search winning products/);
      fireEvent.change(input, { target: { value: "calculate margins" } });
      fireEvent.submit(input.closest("form")!);
      expect(mockPush).toHaveBeenCalledWith("/calculator");
    });

    it("competitor keyword navigates to competitors", () => {
      render(<DashboardHome />);
      const input = screen.getByPlaceholderText(/Search winning products/);
      fireEvent.change(input, { target: { value: "compare prices" } });
      fireEvent.submit(input.closest("form")!);
      expect(mockPush).toHaveBeenCalledWith("/competitors");
    });

    it("AI keyword navigates to ai page", () => {
      render(<DashboardHome />);
      const input = screen.getByPlaceholderText(/Search winning products/);
      fireEvent.change(input, { target: { value: "analyze product" } });
      fireEvent.submit(input.closest("form")!);
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/ai"));
    });

    it("trend keyword navigates to trends", () => {
      render(<DashboardHome />);
      const input = screen.getByPlaceholderText(/Search winning products/);
      fireEvent.change(input, { target: { value: "trending products" } });
      fireEvent.submit(input.closest("form")!);
      expect(mockPush).toHaveBeenCalledWith("/trends");
    });

    it("suggestion chips navigate on click", () => {
      render(<DashboardHome />);
      const chip = screen.getByText(/Find reliable suppliers/);
      fireEvent.click(chip);
      expect(mockPush).toHaveBeenCalledWith("/suppliers");
    });
  });

  describe("Revenue & Profit Hub", () => {
    it("renders Revenue & Profit section divider", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Revenue & Profit")).toBeInTheDocument();
    });

    it("renders revenue chart", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Revenue Overview")).toBeInTheDocument();
    });

    it("renders profit tracker", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Profit Tracker")).toBeInTheDocument();
    });

    it("renders Live indicator", () => {
      render(<DashboardHome />);
      expect(screen.getAllByText("Live").length).toBeGreaterThanOrEqual(1);
    });

    it("renders Full Report link to /revenue", () => {
      render(<DashboardHome />);
      const link = screen.getByText("Full Report").closest("a");
      expect(link).toHaveAttribute("href", "/revenue");
    });

    it("renders View Tracker link to /profit-tracker", () => {
      render(<DashboardHome />);
      const link = screen.getByText("View Tracker").closest("a");
      expect(link).toHaveAttribute("href", "/profit-tracker");
    });
  });

  describe("AI Intelligence Hub", () => {
    it("renders AI Intelligence section divider", () => {
      render(<DashboardHome />);
      expect(screen.getByText("AI Intelligence")).toBeInTheDocument();
    });

    it("renders AI Pick of the Day", () => {
      render(<DashboardHome />);
      expect(screen.getByText("AI Pick of the Day")).toBeInTheDocument();
      expect(screen.getByText("Wireless Earbuds Pro")).toBeInTheDocument();
    });

    it("renders daily pick risk level", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Low Risk")).toBeInTheDocument();
    });

    it("renders daily pick price metrics", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Source Price")).toBeInTheDocument();
      expect(screen.getByText("Sell Price")).toBeInTheDocument();
      expect(screen.getAllByText("Margin").length).toBeGreaterThanOrEqual(1);
    });

    it("renders Why AI Picked This", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Why AI Picked This")).toBeInTheDocument();
      expect(screen.getByText("High demand trend")).toBeInTheDocument();
    });

    it("renders Earnings Preview", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Earnings Preview")).toBeInTheDocument();
      expect(screen.getByText("Profit per Order")).toBeInTheDocument();
    });

    it("renders Market Saturation", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Market Saturation")).toBeInTheDocument();
      expect(screen.getByText("35%")).toBeInTheDocument();
    });

    it("renders Start Selling link to /products", () => {
      render(<DashboardHome />);
      const link = screen.getByText("Start Selling").closest("a");
      expect(link).toHaveAttribute("href", "/products");
    });

    it("renders AI Briefing card", () => {
      render(<DashboardHome />);
      expect(screen.getByText("AI Briefing")).toBeInTheDocument();
      expect(screen.getByText("Bullish")).toBeInTheDocument();
    });

    it("renders Smart Alerts card", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Smart Alerts")).toBeInTheDocument();
      expect(screen.getByText("Price drop detected")).toBeInTheDocument();
    });

    it("renders View All Alerts link", () => {
      render(<DashboardHome />);
      const link = screen.getByText("View All Alerts").closest("a");
      expect(link).toHaveAttribute("href", "/monitoring");
    });
  });

  describe("Product Discovery", () => {
    it("renders Product Discovery section divider", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Product Discovery")).toBeInTheDocument();
    });

    it("renders trending products", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Trending Products")).toBeInTheDocument();
      expect(screen.getAllByText("Wireless Earbuds").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("LED Strip Lights").length).toBeGreaterThanOrEqual(1);
    });

    it("renders product metrics", () => {
      render(<DashboardHome />);
      expect(screen.getByText("$12.99")).toBeInTheDocument();
      expect(screen.getByText("63%")).toBeInTheDocument();
    });

    it("renders demand and competition badges", () => {
      render(<DashboardHome />);
      expect(screen.getByText("high demand")).toBeInTheDocument();
      expect(screen.getByText("low competition")).toBeInTheDocument();
    });

    it("View All links to /products", () => {
      render(<DashboardHome />);
      const link = screen.getByText("View All").closest("a");
      expect(link).toHaveAttribute("href", "/products");
    });

    it("renders feature cards", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Saved Products").closest("a")).toHaveAttribute("href", "/saved");
      expect(screen.getByText("Validation").closest("a")).toHaveAttribute("href", "/product-validation");
      expect(screen.getByText("Listings").closest("a")).toHaveAttribute("href", "/product-listings");
      expect(screen.getByText("Lifecycle").closest("a")).toHaveAttribute("href", "/product-lifecycle");
    });
  });

  describe("Supplier Network", () => {
    it("renders Supplier Network section divider", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Supplier Network")).toBeInTheDocument();
    });

    it("renders Network Status", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Network Status")).toBeInTheDocument();
      expect(screen.getByText("Total Suppliers")).toBeInTheDocument();
    });

    it("renders supplier status breakdown", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Online")).toBeInTheDocument();
      expect(screen.getByText("Busy")).toBeInTheDocument();
      expect(screen.getByText("Offline")).toBeInTheDocument();
    });

    it("renders All Suppliers link", () => {
      render(<DashboardHome />);
      expect(screen.getByText("All Suppliers").closest("a")).toHaveAttribute("href", "/suppliers");
    });

    it("renders SRM link", () => {
      render(<DashboardHome />);
      expect(screen.getByText("SRM").closest("a")).toHaveAttribute("href", "/srm");
    });

    it("renders Top Suppliers list", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Top Suppliers")).toBeInTheDocument();
      expect(screen.getByText("Supplier A")).toBeInTheDocument();
      expect(screen.getByText("Supplier B")).toBeInTheDocument();
      expect(screen.getByText("Supplier C")).toBeInTheDocument();
    });

    it("renders Performance link", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Performance").closest("a")).toHaveAttribute("href", "/supplier-performance");
    });
  });

  describe("Order Operations", () => {
    it("renders Order Operations section divider", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Order Operations")).toBeInTheDocument();
    });

    it("renders Fulfillment Pipeline", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Fulfillment Pipeline")).toBeInTheDocument();
      expect(screen.getByText("65 orders")).toBeInTheDocument();
    });

    it("renders pipeline stages", () => {
      render(<DashboardHome />);
      expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Processing").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Shipped").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Delivered").length).toBeGreaterThanOrEqual(1);
    });

    it("renders recent orders", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Recent Orders")).toBeInTheDocument();
      expect(screen.getByText("John D.")).toBeInTheDocument();
      expect(screen.getByText("Jane S.")).toBeInTheDocument();
    });

    it("renders Pipeline Revenue", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Pipeline Revenue")).toBeInTheDocument();
    });

    it("renders View Pipeline link", () => {
      render(<DashboardHome />);
      expect(screen.getByText("View Pipeline").closest("a")).toHaveAttribute("href", "/fulfillment");
    });

    it("renders Quick Actions links", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Bulk Orders").closest("a")).toHaveAttribute("href", "/bulk-orders");
      expect(screen.getByText("Returns").closest("a")).toHaveAttribute("href", "/returns");
      expect(screen.getByText("Order Router").closest("a")).toHaveAttribute("href", "/order-router");
      expect(screen.getByText("Shipping Optimizer").closest("a")).toHaveAttribute("href", "/shipping-optimizer");
    });
  });

  describe("Market Intelligence", () => {
    it("renders Market Intelligence section divider", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Market Intelligence")).toBeInTheDocument();
    });

    it("renders Market Heatmap", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Market Heatmap")).toBeInTheDocument();
      expect(screen.getAllByText("Electronics").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    it("renders heatmap summary badges", () => {
      render(<DashboardHome />);
      expect(screen.getByText("overheating")).toBeInTheDocument();
      expect(screen.getByText("trending up")).toBeInTheDocument();
    });

    it("renders Market Pulse", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Market Pulse")).toBeInTheDocument();
    });

    it("renders Competitive Tools links", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Competitor Analysis").closest("a")).toHaveAttribute("href", "/competitors");
      expect(screen.getByText("Price War Tracker").closest("a")).toHaveAttribute("href", "/price-war");
      expect(screen.getByText("Reports").closest("a")).toHaveAttribute("href", "/reports");
    });

    it("renders Full Map link", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Full Map").closest("a")).toHaveAttribute("href", "/products");
    });
  });

  describe("Store Operations", () => {
    it("renders Store Operations section divider", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Store Operations")).toBeInTheDocument();
    });

    it("renders all store operation cards with correct links", () => {
      render(<DashboardHome />);
      expect(screen.getByText("My Stores").closest("a")).toHaveAttribute("href", "/store");
      expect(screen.getByText("Multi-Store").closest("a")).toHaveAttribute("href", "/multi-store");
      expect(screen.getByText("Monitoring").closest("a")).toHaveAttribute("href", "/monitoring");
      expect(screen.getByText("Store Health").closest("a")).toHaveAttribute("href", "/health");
    });
  });

  describe("Growth & Tools", () => {
    it("renders Growth & Tools section divider", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Growth & Tools")).toBeInTheDocument();
    });

    it("renders tool cards", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Daily Missions")).toBeInTheDocument();
      expect(screen.getByText("Trend Predictor")).toBeInTheDocument();
      expect(screen.getByText("Customer Service")).toBeInTheDocument();
      expect(screen.getByText("Ad ROI")).toBeInTheDocument();
      expect(screen.getByText("Daily Digest")).toBeInTheDocument();
    });

    it("tool cards link correctly", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Daily Missions").closest("a")).toHaveAttribute("href", "/missions");
      expect(screen.getByText("Trend Predictor").closest("a")).toHaveAttribute("href", "/trends");
      expect(screen.getByText("Customer Service").closest("a")).toHaveAttribute("href", "/customer-service");
      expect(screen.getByText("Ad ROI").closest("a")).toHaveAttribute("href", "/ad-roi");
      expect(screen.getByText("Daily Digest").closest("a")).toHaveAttribute("href", "/digest");
    });
  });

  describe("Market Ticker Footer", () => {
    it("renders Market Ticker footer", () => {
      render(<DashboardHome />);
      expect(screen.getByText("Market Ticker")).toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("shows empty trending when no products", () => {
      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        data: { ...defaultData, trending: [] },
        loading: false, markAlertRead: vi.fn(), markAllAlertsRead: vi.fn(),
        addToCompare: vi.fn(), removeFromCompare: vi.fn(), clearCompare: vi.fn(),
      });
      render(<DashboardHome />);
      expect(screen.getByText("No trending products right now")).toBeInTheDocument();
    });

    it("shows empty suppliers when none connected", () => {
      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        data: { ...defaultData, suppliers: [] },
        loading: false, markAlertRead: vi.fn(), markAllAlertsRead: vi.fn(),
        addToCompare: vi.fn(), removeFromCompare: vi.fn(), clearCompare: vi.fn(),
      });
      render(<DashboardHome />);
      expect(screen.getByText("No suppliers connected")).toBeInTheDocument();
    });

    it("shows empty alerts when none", () => {
      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        data: { ...defaultData, alerts: [] },
        loading: false, markAlertRead: vi.fn(), markAllAlertsRead: vi.fn(),
        addToCompare: vi.fn(), removeFromCompare: vi.fn(), clearCompare: vi.fn(),
      });
      render(<DashboardHome />);
      expect(screen.getByText("No alerts right now")).toBeInTheDocument();
    });

    it("shows empty chart when no revenue data", () => {
      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        data: { ...defaultData, revenueChart: [] },
        loading: false, markAlertRead: vi.fn(), markAllAlertsRead: vi.fn(),
        addToCompare: vi.fn(), removeFromCompare: vi.fn(), clearCompare: vi.fn(),
      });
      render(<DashboardHome />);
      expect(screen.getByText("No revenue data yet")).toBeInTheDocument();
    });

    it("shows empty recent orders when none", () => {
      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        data: { ...defaultData, fulfillmentPipeline: { ...defaultData.fulfillmentPipeline, recentOrders: [] } },
        loading: false, markAlertRead: vi.fn(), markAllAlertsRead: vi.fn(),
        addToCompare: vi.fn(), removeFromCompare: vi.fn(), clearCompare: vi.fn(),
      });
      render(<DashboardHome />);
      expect(screen.getByText("No recent orders")).toBeInTheDocument();
    });

    it("shows empty heatmap when none", () => {
      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        data: { ...defaultData, heatmap: [] },
        loading: false, markAlertRead: vi.fn(), markAllAlertsRead: vi.fn(),
        addToCompare: vi.fn(), removeFromCompare: vi.fn(), clearCompare: vi.fn(),
      });
      render(<DashboardHome />);
      expect(screen.getByText("No heatmap data available")).toBeInTheDocument();
    });

    it("hides ticker footer when empty", () => {
      vi.mocked(useDashboardDataModule.useDashboardData).mockReturnValue({
        data: { ...defaultData, ticker: [] },
        loading: false, markAlertRead: vi.fn(), markAllAlertsRead: vi.fn(),
        addToCompare: vi.fn(), removeFromCompare: vi.fn(), clearCompare: vi.fn(),
      });
      render(<DashboardHome />);
      expect(screen.queryByText("Market Ticker")).toBeNull();
    });
  });
});

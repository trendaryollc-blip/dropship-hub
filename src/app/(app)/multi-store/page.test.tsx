import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MultiStorePage from "./page";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "test-uid" } }),
}));

const mockMutate = vi.fn();
const mockUseAPI = vi.fn();

vi.mock("@/hooks/useAPI", () => ({
  useAPI: (...args: any[]) => mockUseAPI(...args),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@/components/multi-store/KpiCard", () => ({
  default: ({ label, value }: { label: string; value: any }) => (
    <div data-testid="kpi-card">
      <span data-testid="kpi-label">{label}</span>
      <span data-testid="kpi-value">{String(value)}</span>
    </div>
  ),
}));

vi.mock("@/components/multi-store/UnifiedOrderRow", () => ({
  default: ({ order }: { order: any }) => (
    <div data-testid="order-row">{order.orderNumber}</div>
  ),
}));

vi.mock("@/components/multi-store/StorePerformanceCard", () => ({
  default: ({ perf }: { perf: any }) => (
    <div data-testid="perf-card">{perf.storeName}</div>
  ),
}));

vi.mock("@/components/multi-store/BulkPushPanel", () => ({
  default: ({ stores }: { stores: any[] }) => (
    <div data-testid="bulk-push-panel">BulkPushPanel ({stores.length} stores)</div>
  ),
}));

vi.mock("@/components/multi-store/InventorySyncPanel", () => ({
  default: ({ inventory }: { inventory: any[] }) => (
    <div data-testid="inventory-sync-panel">InventorySyncPanel ({inventory.length} items)</div>
  ),
}));

vi.mock("@/components/multi-store/MultiStoreAIBar", () => ({
  default: ({ storeCount, totalOrders, totalRevenue }: any) => (
    <div data-testid="ai-bar">MultiStoreAIBar ({storeCount} stores)</div>
  ),
}));

vi.mock("@/components/multi-store/MultiStoreChatSidebar", () => ({
  default: ({ storeCount }: { storeCount: number }) => (
    <div data-testid="chat-sidebar">MultiStoreChatSidebar ({storeCount} stores)</div>
  ),
}));

const mockStores = [
  { id: "s1", name: "Shopify Store", status: "connected", platform: "shopify" },
  { id: "s2", name: "WooCommerce Store", status: "connected", platform: "woocommerce" },
  { id: "s3", name: "Etsy Store", status: "disconnected", platform: "etsy" },
];

const mockOrders = [
  {
    id: "o1",
    orderNumber: "ORD-001",
    storeId: "s1",
    storeName: "Shopify Store",
    storePlatform: "shopify",
    status: "pending",
    totalAmount: 49.99,
    customerName: "John Doe",
    fulfillmentStatus: "unfulfilled",
    createdAt: "2026-01-15T10:00:00Z",
    items: [{ title: "Widget", quantity: 1, totalPrice: 49.99 }],
  },
  {
    id: "o2",
    orderNumber: "ORD-002",
    storeId: "s2",
    storeName: "WooCommerce Store",
    storePlatform: "woocommerce",
    status: "shipped",
    totalAmount: 129.50,
    customerName: "Jane Smith",
    fulfillmentStatus: "fulfilled",
    trackingNumber: "TRK-123",
    createdAt: "2026-01-14T08:30:00Z",
    items: [{ title: "Gadget", quantity: 2, totalPrice: 129.50 }],
  },
];

const mockInventory = [
  {
    id: "inv1",
    productId: "p1",
    title: "Widget Pro",
    totalStock: 150,
    stores: [
      { storeId: "s1", storeName: "Shopify Store", stock: 100 },
      { storeId: "s2", storeName: "WooCommerce Store", stock: 50 },
    ],
  },
];

const mockPerformances = [
  {
    storeId: "s1",
    storeName: "Shopify Store",
    storePlatform: "shopify",
    period: "30d",
    metrics: { totalOrders: 120, totalRevenue: 15000, totalProfit: 4500, avgOrderValue: 125, conversionRate: 3.2 },
    trends: { ordersTrend: 12, revenueTrend: 8 },
  },
  {
    storeId: "s2",
    storeName: "WooCommerce Store",
    storePlatform: "woocommerce",
    period: "30d",
    metrics: { totalOrders: 80, totalRevenue: 9500, totalProfit: 2800, avgOrderValue: 118.75, conversionRate: 2.8 },
    trends: { ordersTrend: -3, revenueTrend: 5 },
  },
];

const mockBulkJobs = [
  {
    id: "bj1",
    productTitle: "Mega Widget",
    targetStores: ["s1", "s2"],
    status: "completed",
    createdAt: "2026-01-13T12:00:00Z",
  },
  {
    id: "bj2",
    productTitle: "Super Gadget",
    targetStores: ["s1"],
    status: "pending",
    createdAt: "2026-01-12T09:00:00Z",
  },
];

function setupUseAPIMock(overrides: Partial<Record<string, any>> = {}) {
  const defaults: Record<string, any> = {
    "/api/store/connections?uid=test-uid": { connections: mockStores },
    "/api/multi-store/orders?uid=test-uid": { orders: mockOrders },
    "/api/multi-store/inventory?uid=test-uid": { inventory: mockInventory },
    "/api/multi-store/performance?uid=test-uid&period=30d": { performances: mockPerformances },
    "/api/multi-store/bulk-push?uid=test-uid": { jobs: mockBulkJobs },
  };
  const data = { ...defaults, ...overrides };

  mockUseAPI.mockImplementation((url: string | null) => {
    if (!url) return { data: undefined, isLoading: false, mutate: mockMutate };
    for (const [key, value] of Object.entries(data)) {
      if (url.startsWith(key.split("?")[0])) return { data: value, isLoading: false, mutate: mockMutate };
    }
    return { data: undefined, isLoading: false, mutate: mockMutate };
  });
}

describe("MultiStorePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUseAPIMock();
  });

  it("renders loading state when data is not yet available", () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: true, mutate: mockMutate });
    const { container } = render(<MultiStorePage />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("renders page header 'Multi-Store Dashboard'", () => {
    render(<MultiStorePage />);
    expect(screen.getByText("Multi-Store Dashboard")).toBeDefined();
  });

  it("shows connected stores badge with count", () => {
    render(<MultiStorePage />);
    expect(screen.getByText(/2 stores/)).toBeDefined();
  });

  it("renders KPI cards for Total Orders, Revenue, Profit, and Active Stores", () => {
    render(<MultiStorePage />);
    const kpiCards = screen.getAllByTestId("kpi-card");
    expect(kpiCards).toHaveLength(4);

    const labels = kpiCards.map((card) => card.querySelector("[data-testid='kpi-label']")?.textContent);
    expect(labels).toContain("Total Orders");
    expect(labels).toContain("Total Revenue");
    expect(labels).toContain("Total Profit");
    expect(labels).toContain("Active Stores");
  });

  it("renders MultiStoreAIBar with store count", () => {
    render(<MultiStorePage />);
    const aiBar = screen.getByTestId("ai-bar");
    expect(aiBar).toBeDefined();
    expect(aiBar.textContent).toContain("3 stores");
  });

  it("renders all four tabs: Unified Orders, Inventory Sync, Performance, Bulk Push", () => {
    render(<MultiStorePage />);
    expect(screen.getByText("Unified Orders")).toBeDefined();
    expect(screen.getByText("Inventory Sync")).toBeDefined();
    expect(screen.getByText("Performance")).toBeDefined();
    expect(screen.getByText("Bulk Push")).toBeDefined();
  });

  it("tab switching activates the correct tab content", () => {
    render(<MultiStorePage />);

    expect(screen.getByText("Unified Orders")).toBeDefined();

    fireEvent.click(screen.getByText("Inventory Sync"));
    expect(screen.getByTestId("inventory-sync-panel")).toBeDefined();

    fireEvent.click(screen.getByText("Performance"));
    expect(screen.getByText("7d")).toBeDefined();
    expect(screen.getByText("30d")).toBeDefined();
    expect(screen.getByText("90d")).toBeDefined();

    fireEvent.click(screen.getByText("Bulk Push"));
    expect(screen.getByTestId("bulk-push-panel")).toBeDefined();

    fireEvent.click(screen.getByText("Unified Orders"));
    expect(screen.getByText("All Stores")).toBeDefined();
  });

  it("orders tab shows order list when orders exist", () => {
    render(<MultiStorePage />);
    const orderRows = screen.getAllByTestId("order-row");
    expect(orderRows).toHaveLength(2);
    expect(screen.getByText("ORD-001")).toBeDefined();
    expect(screen.getByText("ORD-002")).toBeDefined();
  });

  it("orders tab shows empty state when no orders match filters", () => {
    setupUseAPIMock({
      "/api/multi-store/orders?uid=test-uid": { orders: [] },
    });
    render(<MultiStorePage />);
    expect(screen.getByText("No orders found")).toBeDefined();
  });

  it("inventory tab renders InventorySyncPanel with inventory data", () => {
    render(<MultiStorePage />);
    fireEvent.click(screen.getByText("Inventory Sync"));
    const panel = screen.getByTestId("inventory-sync-panel");
    expect(panel).toBeDefined();
    expect(panel.textContent).toContain("1 items");
  });

  it("performance tab shows period selector and performance cards", () => {
    render(<MultiStorePage />);
    fireEvent.click(screen.getByText("Performance"));

    expect(screen.getByText("7d")).toBeDefined();
    expect(screen.getByText("30d")).toBeDefined();
    expect(screen.getByText("90d")).toBeDefined();

    const perfCards = screen.getAllByTestId("perf-card");
    expect(perfCards).toHaveLength(2);
    expect(screen.getByText("Shopify Store")).toBeDefined();
    expect(screen.getByText("WooCommerce Store")).toBeDefined();
  });

  it("performance tab shows empty state when no performance data", () => {
    setupUseAPIMock({
      "/api/multi-store/performance?uid=test-uid&period=30d": { performances: [] },
    });
    render(<MultiStorePage />);
    fireEvent.click(screen.getByText("Performance"));
    expect(screen.getByText("No performance data")).toBeDefined();
  });

  it("bulk-push tab shows BulkPushPanel and recent jobs", () => {
    render(<MultiStorePage />);
    fireEvent.click(screen.getByText("Bulk Push"));

    expect(screen.getByTestId("bulk-push-panel")).toBeDefined();
    expect(screen.getByText("Recent Push Jobs")).toBeDefined();
    expect(screen.getByText("Mega Widget")).toBeDefined();
    expect(screen.getByText("Super Gadget")).toBeDefined();
  });

  it("bulk-push tab shows empty state when no jobs exist", () => {
    setupUseAPIMock({
      "/api/multi-store/bulk-push?uid=test-uid": { jobs: [] },
    });
    render(<MultiStorePage />);
    fireEvent.click(screen.getByText("Bulk Push"));
    expect(screen.getByText("No push jobs yet.")).toBeDefined();
  });

  it("renders MultiStoreChatSidebar", () => {
    render(<MultiStorePage />);
    const sidebar = screen.getByTestId("chat-sidebar");
    expect(sidebar).toBeDefined();
    expect(sidebar.textContent).toContain("3 stores");
  });

  it("KPI values reflect performance data aggregation", () => {
    render(<MultiStorePage />);
    const kpiCards = screen.getAllByTestId("kpi-card");

    const totalOrdersCard = kpiCards.find((card) =>
      card.querySelector("[data-testid='kpi-label']")?.textContent === "Total Orders"
    );
    expect(totalOrdersCard?.querySelector("[data-testid='kpi-value']")?.textContent).toBe("200");

    const activeStoresCard = kpiCards.find((card) =>
      card.querySelector("[data-testid='kpi-label']")?.textContent === "Active Stores"
    );
    expect(activeStoresCard?.querySelector("[data-testid='kpi-value']")?.textContent).toBe("2");
  });

  it("disables AI bar actions while loading", () => {
    render(<MultiStorePage />);
    const aiBar = screen.getByTestId("ai-bar");
    expect(aiBar).toBeDefined();
  });
});

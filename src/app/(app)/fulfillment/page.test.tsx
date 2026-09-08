import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FulfillmentPage from "./page";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("lucide-react", () => {
  const identity = (props: any) => <span {...props} />;
  return {
    Package: identity,
    Clock: identity,
    Truck: identity,
    CheckCircle2: identity,
    Settings: identity,
    Loader2: (props: any) => <span data-testid="loader2" {...props} />,
    Search: identity,
    Globe: identity,
    RefreshCw: identity,
    X: identity,
    FileText: identity,
    Shield: identity,
    LayoutTemplate: identity,
    AlertCircle: identity,
  };
});

const mockUseAuth = vi.fn();
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseAPI = vi.fn();
vi.mock("@/hooks/useAPI", () => ({
  useAPI: (...args: any[]) => mockUseAPI(...args),
}));

const mockSafeFetch = vi.fn(() => Promise.resolve({}));
vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: (...args: any[]) => mockSafeFetch(...args),
}));

vi.mock("@/components/fulfillment/OnboardingBanner", () => ({
  default: ({ onDismiss }: any) => (
    <div data-testid="onboarding-banner">
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));

vi.mock("@/components/fulfillment/OrderCard", () => ({
  default: ({ order }: any) => (
    <div data-testid="order-card">{order.orderNumber}</div>
  ),
}));

vi.mock("@/components/fulfillment/FulfillmentSettingsTab", () => ({
  default: (props: any) => <div data-testid="fulfillment-settings-tab" />,
}));

vi.mock("@/components/fulfillment/FulfillmentAuditTab", () => ({
  default: (props: any) => <div data-testid="fulfillment-audit-tab" />,
}));

vi.mock("@/components/fulfillment/FulfillmentRulesTab", () => ({
  default: (props: any) => <div data-testid="fulfillment-rules-tab" />,
}));

vi.mock("@/components/fulfillment/FulfillmentTemplatesTab", () => ({
  default: (props: any) => <div data-testid="fulfillment-templates-tab" />,
}));

vi.mock("@/components/fulfillment/FulfillmentAIBar", () => ({
  default: (props: any) => <div data-testid="fulfillment-ai-bar" />,
}));

vi.mock("@/components/fulfillment/FulfillmentChatSidebar", () => ({
  default: (props: any) => <div data-testid="fulfillment-chat-sidebar" />,
}));

function makeOrder(overrides: Partial<any> = {}) {
  return {
    id: "ord-1",
    trendaryoOrderId: "tord-1",
    orderNumber: "ORD-001",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    status: "pending",
    items: [
      {
        productId: "p1",
        name: "Widget",
        price: 29.99,
        quantity: 1,
        source: "cj",
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        imageUrl: "",
        platformProductId: "",
        unitCost: 12.0,
      },
    ],
    shippingAddress: {
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "555-0100",
      street: "123 Main St",
      city: "Springfield",
      state: "IL",
      zipCode: "62701",
      country: "US",
    },
    platformOrders: [],
    totalRevenue: 29.99,
    totalCost: 12.0,
    profit: 17.99,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function setupUseAPIMock(orders: any[] = [], settings?: any, connections: any[] = []) {
  mockUseAPI.mockImplementation((url: string | null) => {
    if (!url) return { data: undefined, isLoading: false, mutate: vi.fn() };
    if (url.includes("/fulfillment?")) {
      return { data: { orders }, isLoading: false, mutate: vi.fn() };
    }
    if (url.includes("/fulfillment/settings")) {
      return { data: settings ? { settings } : undefined, isLoading: false, mutate: vi.fn() };
    }
    if (url.includes("/store/connections")) {
      return { data: { connections }, isLoading: false, mutate: vi.fn() };
    }
    return { data: undefined, isLoading: false, mutate: vi.fn() };
  });
}

describe("FulfillmentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { uid: "test-uid" } });
  });

  it("renders loading state", () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: true, mutate: vi.fn() });
    render(<FulfillmentPage />);
    expect(screen.getByTestId("loader2")).toBeInTheDocument();
  });

  it("renders page header 'Fulfillment Center'", () => {
    setupUseAPIMock([]);
    render(<FulfillmentPage />);
    expect(screen.getByText("Fulfillment Center")).toBeInTheDocument();
  });

  it("renders stats bar with order counts when orders exist", () => {
    const orders = [
      makeOrder({ id: "1", status: "pending", orderNumber: "ORD-001" }),
      makeOrder({ id: "2", status: "pending", orderNumber: "ORD-002" }),
      makeOrder({ id: "3", status: "in_progress", orderNumber: "ORD-003" }),
      makeOrder({ id: "4", status: "shipped", orderNumber: "ORD-004" }),
      makeOrder({ id: "5", status: "delivered", orderNumber: "ORD-005" }),
    ];
    setupUseAPIMock(orders);
    render(<FulfillmentPage />);
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
  });

  it("renders FulfillmentAIBar when orders exist", () => {
    setupUseAPIMock([makeOrder()]);
    render(<FulfillmentPage />);
    expect(screen.getByTestId("fulfillment-ai-bar")).toBeInTheDocument();
  });

  it("renders status tabs (Pending, In Progress, Shipped, Completed)", () => {
    setupUseAPIMock([]);
    render(<FulfillmentPage />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Shipped")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("tab switching works", () => {
    setupUseAPIMock([
      makeOrder({ id: "1", status: "pending", orderNumber: "ORD-001" }),
    ]);
    render(<FulfillmentPage />);
    expect(screen.getByText("ORD-001")).toBeInTheDocument();
    const inProgressButtons = screen.getAllByText("In Progress");
    const inProgressButton = inProgressButtons.find((el) => el.tagName === "BUTTON")!;
    fireEvent.click(inProgressButton);
    expect(screen.queryByText("ORD-001")).not.toBeInTheDocument();
    const pendingButtons = screen.getAllByText("Pending");
    const pendingButton = pendingButtons.find((el) => el.tagName === "BUTTON")!;
    fireEvent.click(pendingButton);
    expect(screen.getByText("ORD-001")).toBeInTheDocument();
  });

  it("renders OnboardingBanner when no orders", () => {
    setupUseAPIMock([]);
    render(<FulfillmentPage />);
    expect(screen.getByTestId("onboarding-banner")).toBeInTheDocument();
  });

  it("renders search and filter controls when not in settings", () => {
    setupUseAPIMock([makeOrder()]);
    render(<FulfillmentPage />);
    expect(screen.getByPlaceholderText("Search orders, customers, products...")).toBeInTheDocument();
    expect(screen.getByText("All Stores")).toBeInTheDocument();
    expect(screen.getByText("Sync Orders")).toBeInTheDocument();
  });

  it("renders FulfillmentChatSidebar", () => {
    setupUseAPIMock([]);
    render(<FulfillmentPage />);
    expect(screen.getByTestId("fulfillment-chat-sidebar")).toBeInTheDocument();
  });

  it("settings gear button toggles settings panel", () => {
    setupUseAPIMock([]);
    render(<FulfillmentPage />);
    expect(screen.queryByTestId("fulfillment-settings-tab")).not.toBeInTheDocument();
    const settingsButton = screen.getByTitle("Management");
    fireEvent.click(settingsButton);
    expect(screen.getByTestId("fulfillment-settings-tab")).toBeInTheDocument();
    fireEvent.click(settingsButton);
    expect(screen.queryByTestId("fulfillment-settings-tab")).not.toBeInTheDocument();
  });

  it("settings panel shows management tabs (Settings, Audit, Rules, Templates)", () => {
    setupUseAPIMock([]);
    render(<FulfillmentPage />);
    fireEvent.click(screen.getByTitle("Management"));
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Audit")).toBeInTheDocument();
    expect(screen.getByText("Rules")).toBeInTheDocument();
    expect(screen.getByText("Templates")).toBeInTheDocument();
  });

  it("sync orders button is present", () => {
    setupUseAPIMock([]);
    render(<FulfillmentPage />);
    expect(screen.getAllByText("Sync Orders").length).toBeGreaterThanOrEqual(1);
  });
});

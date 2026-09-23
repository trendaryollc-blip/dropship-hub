import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import type { RoutingDecision, RoutingPreferences, RoutingAnalytics, RoutingHistory } from "@/types/order";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockSupplier = {
  supplierId: "s1",
  supplierName: "CJ Dropshipping",
  inStock: true,
  stockLevel: 420,
  shippingDays: 5,
  shippingCost: 3.5,
  unitCost: 12,
  totalCost: 27.5,
  qualityScore: 92,
  location: "China",
  reliabilityScore: 95,
  totalScore: 88,
  selected: true,
};

const mockDecision: RoutingDecision = {
  id: "d1",
  orderId: "ORD-1001",
  orderDate: "2026-09-20T00:00:00.000Z",
  customerName: "Jane Doe",
  customerLocation: "New York, US",
  productTitle: "Wireless Earbuds",
  productImage: "",
  quantity: 2,
  totalPrice: 59.98,
  selectedSupplier: mockSupplier,
  alternativeSuppliers: [],
  reasoning: "Best balance of speed and cost",
  status: "routed",
  routedAt: "2026-09-21T00:00:00.000Z",
  estimatedDelivery: "2026-09-26",
  shippingCost: 3.5,
  totalCost: 27.5,
};

const mockPrefs: RoutingPreferences = {
  optimization: "speed",
  maxShippingDays: 7,
  minQualityScore: 80,
  preferLocalWarehouse: true,
  autoFallback: true,
  maxFallbackAttempts: 3,
};

const mockAnalytics: RoutingAnalytics = {
  totalRouted: 128,
  avgShippingDays: 5.2,
  avgCost: 14.5,
  supplierDistribution: [
    { name: "CJ Dropshipping", count: 80, color: "#22c55e" },
    { name: "Local Warehouse", count: 48, color: "#3b82f6" },
  ],
  optimizationBreakdown: [{ type: "speed", count: 128 }],
  costSavings: 240.5,
  timeSavings: 3.5,
  dailyCounts: [
    { date: "2026-09-18", count: 4 },
    { date: "2026-09-19", count: 6 },
    { date: "2026-09-20", count: 5 },
  ],
};

const mockHistory: RoutingHistory = {
  id: "h1",
  orderId: "ORD-1001",
  productTitle: "Wireless Earbuds",
  customerLocation: "New York, US",
  selectedSupplier: "CJ Dropshipping",
  shippingDays: 5,
  shippingCost: 3.5,
  totalCost: 27.5,
  reason: "Fastest shipping",
  status: "routed",
  routedAt: "2026-09-21T00:00:00.000Z",
};

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
const mockRevalidate = vi.fn();
const mockTrigger = vi.fn();

function defaultUseAPIMock(url: string) {
  const base = { mutate: mockMutate, isLoading: false, error: undefined as unknown };
  if (url.includes("type=decisions")) return { ...base, data: { decisions: [mockDecision], totalCount: 1, page: 1, limit: 20, totalPages: 1 } };
  if (url.includes("type=preferences")) return { ...base, data: { preferences: mockPrefs } };
  if (url.includes("type=analytics")) return { ...base, data: { analytics: mockAnalytics } };
  if (url.includes("type=history")) return { ...base, data: { history: [mockHistory] } };
  if (url.includes("type=suppliers")) return { ...base, data: { suppliers: ["CJ Dropshipping", "Local Warehouse"] } };
  return { ...base, data: undefined };
}

const mockUseAPI = vi.fn((url: string) => defaultUseAPIMock(url));
vi.mock("@/hooks/useAPI", () => ({
  useAPI: (url: string) => mockUseAPI(url),
  useMutation: (_url: string, options?: { onSuccess?: (data: unknown) => void }) => ({
    trigger: async (args?: unknown) => {
      const result = await mockTrigger(args);
      options?.onSuccess?.(result);
      return result;
    },
    data: undefined,
    error: undefined,
    isMutating: false,
  }),
  revalidate: (url: string) => mockRevalidate(url),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1" } }),
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/hooks/useAnimatedCounter", () => ({
  useAnimatedCounter: (value: number) => value,
}));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock("@/components/ui/Toast", () => ({ useToast: () => mockToast }));

import OrderRouterPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAPI.mockReset().mockImplementation((url: string) => defaultUseAPIMock(url));
  mockTrigger.mockReset().mockResolvedValue({ success: true });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OrderRouterPage", () => {
  it("renders header, tabs, KPIs, decision card and settings panel", () => {
    render(<OrderRouterPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Order Router" })).toBeTruthy();
    for (const tab of ["queue", "analytics", "history", "settings"]) {
      expect(screen.getByRole("button", { name: tab })).toBeTruthy();
    }
    expect(screen.getByText("Orders Routed")).toBeTruthy();
    expect(screen.getByText("Avg Cost")).toBeTruthy();
    expect(screen.getByText("Wireless Earbuds")).toBeTruthy();
    expect(screen.getByText(/ORD-1001/)).toBeTruthy();
    expect(screen.getByText("Routing Preferences")).toBeTruthy();
    expect(screen.getAllByText("CJ Dropshipping").length).toBeGreaterThan(0);
  });

  it("shows loading state while fetching", () => {
    mockUseAPI.mockImplementation((url: string) => {
      if (url.includes("type=decisions")) return { data: undefined, mutate: mockMutate, isLoading: true, error: undefined };
      return defaultUseAPIMock(url);
    });
    render(<OrderRouterPage />);
    expect(screen.getByText("Loading routing data...")).toBeTruthy();
    expect(screen.queryByText("Orders Routed")).toBeNull();
  });

  it("shows error state with retry when decisions fail", () => {
    mockUseAPI.mockImplementation((url: string) => {
      if (url.includes("type=decisions")) return { data: undefined, mutate: mockMutate, isLoading: false, error: new Error("Boom") };
      return defaultUseAPIMock(url);
    });
    render(<OrderRouterPage />);
    expect(screen.getByText("Couldn't load routing data.")).toBeTruthy();
    expect(screen.getByText("Boom")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("shows empty state when no decisions exist", () => {
    mockUseAPI.mockImplementation((url: string) => {
      if (url.includes("type=decisions")) return { data: { decisions: [], totalCount: 0, page: 1, totalPages: 1 }, mutate: mockMutate, isLoading: false, error: undefined };
      return defaultUseAPIMock(url);
    });
    render(<OrderRouterPage />);
    expect(screen.getByText("No routing decisions yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Route Your First Order" })).toBeTruthy();
  });

  it("routes a new order through the modal on success", async () => {
    render(<OrderRouterPage />);
    fireEvent.click(screen.getByRole("button", { name: "Route Order" }));

    expect(screen.getByText("Route New Order")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("ORD-001"), { target: { value: "ORD-9001" } });
    fireEvent.change(screen.getByPlaceholderText("Product name"), { target: { value: "USB-C Hub" } });
    fireEvent.change(screen.getByPlaceholderText("New York, US"), { target: { value: "Austin, US" } });

    const modal = screen.getByText("Route New Order").closest(".fixed") as HTMLElement;
    fireEvent.click(within(modal).getByRole("button", { name: "Route Order" }));

    await waitFor(() => {
      expect(mockTrigger).toHaveBeenCalledWith({
        method: "POST",
        body: expect.objectContaining({ action: "route", orderId: "ORD-9001", productTitle: "USB-C Hub", customerLocation: "Austin, US" }),
      });
    });
    expect(mockToast.success).toHaveBeenCalledWith("Order routed successfully");
    expect(mockRevalidate).toHaveBeenCalledWith("/api/orders?type=decisions");
    await waitFor(() => expect(screen.queryByText("Route New Order")).toBeNull());
  });

  it("keeps the route modal form filled when routing fails", async () => {
    mockTrigger.mockRejectedValueOnce(new Error("No stock"));
    render(<OrderRouterPage />);
    fireEvent.click(screen.getByRole("button", { name: "Route Order" }));

    fireEvent.change(screen.getByPlaceholderText("ORD-001"), { target: { value: "ORD-9002" } });
    fireEvent.change(screen.getByPlaceholderText("Product name"), { target: { value: "Desk Lamp" } });
    fireEvent.change(screen.getByPlaceholderText("New York, US"), { target: { value: "Miami, US" } });

    const modal = screen.getByText("Route New Order").closest(".fixed") as HTMLElement;
    fireEvent.click(within(modal).getByRole("button", { name: "Route Order" }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Failed to route order. Please try again."));
    // Regression: a failed route must not close the modal or discard input.
    expect(screen.getByText("Route New Order")).toBeTruthy();
    expect(screen.getByPlaceholderText("ORD-001")).toHaveValue("ORD-9002");
    expect(screen.getByPlaceholderText("Product name")).toHaveValue("Desk Lamp");
  });

  it("saves preferences via PUT with exactly one success toast", async () => {
    render(<OrderRouterPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockTrigger).toHaveBeenCalledWith({
        method: "PUT",
        body: {
          optimization: "speed",
          maxShippingDays: 7,
          minQualityScore: 80,
          preferLocalWarehouse: true,
          autoFallback: true,
        },
      });
    });
    // Regression: exactly one toast — the panel toasts, the parent only revalidates.
    expect(mockToast.success).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledWith("Routing preferences saved");
    expect(mockRevalidate).toHaveBeenCalledWith("/api/orders?type=preferences");
    // Exits edit mode after a successful save.
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit Settings" })).toBeTruthy());
  });

  it("shows an error toast when saving preferences fails", async () => {
    mockTrigger.mockRejectedValueOnce(new Error("validation failed"));
    render(<OrderRouterPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Failed to save preferences. Please try again."));
    // Stays in edit mode so the user can retry.
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(mockToast.success).not.toHaveBeenCalled();
  });
});
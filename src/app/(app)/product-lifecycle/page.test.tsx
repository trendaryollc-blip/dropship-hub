import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();

const mockProduct = {
  id: "p1",
  productId: "prod_1",
  productTitle: "Smart Fitness Band",
  productImage: "",
  category: "Electronics",
  currentStage: "winning",
  stageEnteredAt: "2026-01-15T00:00:00.000Z",
  daysInStage: 3,
  totalDaysTracked: 45,
  supplierUrl: "",
  storeUrl: "",
  notes: "",
  archived: false,
  snapshots: [],
  metrics: {
    totalOrders: 120,
    totalRevenue: 4800,
    totalProfit: 1440,
    avgProfitMargin: 30,
    competitionCount: 18,
    searchVolume: 900,
    trendDirection: "rising",
  },
  alerts: [],
  recommendations: ["Scale winning ads"],
  createdAt: "2026-01-01T00:00:00.000Z",
};

const mockAlert = {
  id: "a1",
  type: "stage_transition",
  severity: "info",
  title: "Advanced to winning",
  description: "Smart Fitness Band moved from testing to winning",
  read: false,
  productTitle: "Smart Fitness Band",
  productImage: "",
};

const stageList = ["discovery", "testing", "winning", "scaling", "saturation", "sunset"].map((stage) => ({
  stage,
  count: stage === "winning" ? 1 : 0,
  products: stage === "winning" ? ["Smart Fitness Band"] : [],
}));

function defaultUseAPIMock(url: string) {
  if (url.includes("type=alerts")) {
    return { data: { alerts: [mockAlert] }, mutate: mockMutate, isLoading: false, error: undefined };
  }
  if (url.includes("type=stages")) {
    return { data: { stages: stageList }, mutate: mockMutate, isLoading: false, error: undefined };
  }
  return { data: { products: [mockProduct] }, mutate: mockMutate, isLoading: false, error: undefined };
}

const mockUseAPI = vi.fn((url: string) => defaultUseAPIMock(url));
vi.mock("@/hooks/useAPI", () => ({ useAPI: (url: string) => mockUseAPI(url) }));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1" } }),
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock("@/components/ui/Toast", () => ({ useToast: () => mockToast }));

const mockAuthJson = vi.fn();
vi.mock("@/lib/auth-headers", () => ({ authJson: (...args: unknown[]) => mockAuthJson(...args) }));

import ProductLifecyclePage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAPI.mockReset().mockImplementation((url: string) => defaultUseAPIMock(url));
  mockAuthJson.mockResolvedValue({});
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProductLifecyclePage", () => {
  it("renders header, tabs, KPIs and pipeline", () => {
    render(<ProductLifecyclePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Product Lifecycle" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "pipeline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "products" })).toBeTruthy();
    expect(screen.getByText("Total Products")).toBeTruthy();
    expect(screen.getByText("Lifecycle Pipeline")).toBeTruthy();
    expect(screen.getByText("Recent Alerts")).toBeTruthy();
    expect(screen.getByText("Smart Fitness Band")).toBeTruthy();
  });

  it("shows loading state while fetching", () => {
    mockUseAPI.mockImplementation((url: string) => {
      if (url.includes("type=overview")) return { data: undefined, error: undefined, isLoading: true, mutate: mockMutate };
      return defaultUseAPIMock(url);
    });
    render(<ProductLifecyclePage />);
    expect(screen.getByText("Loading lifecycle data...")).toBeTruthy();
    expect(screen.queryByText("Total Products")).toBeNull();
  });

  it("shows error state with retry when overview fails", () => {
    mockUseAPI.mockImplementation((url: string) => {
      if (url.includes("type=overview")) return { data: undefined, error: new Error("Network down"), isLoading: false, mutate: mockMutate };
      return defaultUseAPIMock(url);
    });
    render(<ProductLifecyclePage />);
    expect(screen.getByText("Failed to load lifecycle data")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("adds a product through the modal", async () => {
    render(<ProductLifecyclePage />);
    fireEvent.click(screen.getByRole("button", { name: "Add Product" }));
    expect(screen.getByText("Add Product to Lifecycle")).toBeTruthy();

    const input = screen.getByPlaceholderText("e.g. Smart Fitness Band");
    fireEvent.change(input, { target: { value: "Organic Green Tea" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith(
        "/api/products/lifecycle",
        expect.objectContaining({ productTitle: "Organic Green Tea", currentStage: "discovery" }),
        "POST"
      );
    });
    expect(mockToast.success).toHaveBeenCalledWith("Product added to lifecycle");
    await waitFor(() => expect(screen.queryByText("Add Product to Lifecycle")).toBeNull());
  });

  it("keeps the add modal open with input when the API fails", async () => {
    mockAuthJson.mockRejectedValueOnce(new Error("Permission denied"));
    render(<ProductLifecyclePage />);
    fireEvent.click(screen.getByRole("button", { name: "Add Product" }));

    const input = screen.getByPlaceholderText("e.g. Smart Fitness Band");
    fireEvent.change(input, { target: { value: "Doomed Product" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Permission denied"));
    // Regression: a failed save must not close the modal or discard input.
    expect(screen.getByText("Add Product to Lifecycle")).toBeTruthy();
    expect(screen.getByPlaceholderText("e.g. Smart Fitness Band")).toHaveValue("Doomed Product");
  });

  it("moves a product to another stage from the products tab", async () => {
    render(<ProductLifecyclePage />);
    fireEvent.click(screen.getByRole("button", { name: "products" }));
    fireEvent.click(screen.getByRole("button", { name: "Discovery" }));

    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith(
        "/api/products/lifecycle?action=stage",
        { productId: "prod_1", newStage: "discovery" },
        "PATCH"
      );
    });
    expect(mockToast.success).toHaveBeenCalledWith("Product moved to Discovery");
  });

  it("deletes a product after confirmation", async () => {
    render(<ProductLifecyclePage />);
    fireEvent.click(screen.getByRole("button", { name: "products" }));
    fireEvent.click(screen.getByText("Smart Fitness Band"));

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/products/lifecycle", { productId: "prod_1" }, "DELETE");
    });
    expect(mockToast.success).toHaveBeenCalledWith("Product deleted");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("marks alerts read from the alerts tab", async () => {
    render(<ProductLifecyclePage />);
    fireEvent.click(screen.getByRole("button", { name: /alerts/ }));
    expect(screen.getByText(/1 alert.*1 unread/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith(
        "/api/products/lifecycle?action=alerts-read",
        { alertIds: ["a1"] },
        "PATCH"
      );
    });
  });

  it("shows empty state on products tab when no products exist", () => {
    mockUseAPI.mockImplementation((url: string) => {
      if (url.includes("type=overview")) return { data: { products: [] }, error: undefined, isLoading: false, mutate: mockMutate };
      return defaultUseAPIMock(url);
    });
    render(<ProductLifecyclePage />);
    fireEvent.click(screen.getByRole("button", { name: "products" }));
    expect(screen.getByText("No products found")).toBeTruthy();
    expect(screen.getByText("Add your first product to start tracking its lifecycle")).toBeTruthy();
  });
});

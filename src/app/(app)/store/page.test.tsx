import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StorePage from "./page";
import { useAPI } from "@/hooks/useAPI";
import type { ConnectedStore } from "@/components/stores/ConnectedStoresList";
import type { PushedProduct } from "@/components/stores/PushedProductsList";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "test-uid", email: "test@test.com" } }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn(() => ({ data: undefined, isLoading: false, mutate: vi.fn() })),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(() => Promise.resolve({})),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/store",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

const mockUseAPI = vi.mocked(useAPI);

const makeConnection = (overrides: Partial<ConnectedStore> = {}): ConnectedStore => ({
  id: "s1",
  platform: "shopify",
  name: "My Store",
  url: "https://store.myshopify.com",
  status: "connected",
  connectedAt: "2024-01-01",
  lastSyncAt: new Date(Date.now() - 3600000).toISOString(),
  productCount: 5,
  ...overrides,
});

const makeProduct = (overrides: Partial<PushedProduct> = {}): PushedProduct => ({
  id: "p1",
  storeId: "s1",
  storeName: "My Store",
  productTitle: "Test Product",
  productImage: "",
  productPrice: 10,
  productUrl: "https://example.com",
  status: "live",
  pushedAt: "2024-01-01",
  ...overrides,
});

function renderWithData({
  connections = [],
  products = [],
  isLoading = false,
}: {
  connections?: ConnectedStore[];
  products?: PushedProduct[];
  isLoading?: boolean;
} = {}) {
  mockUseAPI.mockImplementation((url: string | null) => {
    if (!url) return { data: undefined, isLoading: false, mutate: vi.fn() } as any;
    if (url.includes("/api/store/connections")) {
      return {
        data: isLoading ? undefined : { connections },
        isLoading,
        mutate: vi.fn(),
      } as any;
    }
    if (url.includes("/api/store/push")) {
      return {
        data: isLoading ? undefined : { products },
        isLoading,
        mutate: vi.fn(),
      } as any;
    }
    return { data: undefined, isLoading, mutate: vi.fn() } as any;
  });

  return render(<StorePage />);
}

describe("StorePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially when data is loading", () => {
    const { container } = renderWithData({ isLoading: true });
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText("My Stores")).not.toBeInTheDocument();
  });

  it("renders page header 'My Stores'", () => {
    renderWithData();
    expect(screen.getByText("My Stores")).toBeInTheDocument();
  });

  it("shows connected stores count badge when connections exist", () => {
    renderWithData({ connections: [makeConnection(), makeConnection({ id: "s2", name: "Store 2" })] });
    expect(screen.getByText("2 connected")).toBeInTheDocument();
  });

  it("does not show count badge when no connections", () => {
    renderWithData({ connections: [] });
    expect(screen.queryByText(/connected/)).not.toBeInTheDocument();
  });

  it("renders Connected Stores and Pushed Products tabs", () => {
    renderWithData();
    expect(screen.getByText("Connected Stores")).toBeInTheDocument();
    expect(screen.getByText(/Pushed Products/)).toBeInTheDocument();
  });

  it("defaults to stores tab active", () => {
    renderWithData({ connections: [makeConnection()] });
    const storesTab = screen.getByText("Connected Stores").closest("button")!;
    expect(storesTab.className).toContain("bg-accent");
  });

  it("switches to products tab on click", () => {
    renderWithData({ products: [makeProduct()] });
    fireEvent.click(screen.getByText(/Pushed Products/));
    expect(screen.getByText("Test Product")).toBeInTheDocument();
  });

  it("switches back to stores tab on click", () => {
    renderWithData({ connections: [makeConnection()], products: [makeProduct()] });
    fireEvent.click(screen.getByText(/Pushed Products/));
    fireEvent.click(screen.getByText("Connected Stores"));
    expect(screen.getByText("Your Connected Stores")).toBeInTheDocument();
  });

  it("renders StoreStatsBar with data when connections exist", () => {
    renderWithData({ connections: [makeConnection()] });
    expect(screen.getByText("Products Live")).toBeInTheDocument();
    expect(screen.getByText("Last Sync")).toBeInTheDocument();
    expect(screen.getByText("Errors")).toBeInTheDocument();
    const connectedElements = screen.getAllByText("Connected");
    expect(connectedElements.length).toBeGreaterThanOrEqual(1);
  });

  it("does not render StoreStatsBar when no connections", () => {
    renderWithData({ connections: [] });
    expect(screen.queryByText("Connected")).not.toBeInTheDocument();
  });

  it("does not render StoreAIBar on this page", () => {
    renderWithData({ connections: [makeConnection()] });
    expect(screen.queryByText("AI-Powered Actions")).not.toBeInTheDocument();
  });

  it("renders StoreHealthPanel when on stores tab", () => {
    renderWithData({ connections: [makeConnection()] });
    expect(screen.getByText("Store Health")).toBeInTheDocument();
  });

  it("renders StoreCuratedTab when on stores tab", () => {
    renderWithData({ connections: [] });
    expect(screen.getByText("Connect Your Store")).toBeInTheDocument();
  });

  it("renders PushedProductsList when on products tab", () => {
    renderWithData({ products: [makeProduct()] });
    fireEvent.click(screen.getByText(/Pushed Products/));
    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("My Store")).toBeInTheDocument();
  });

  it("renders empty state in PushedProductsList when no products", () => {
    renderWithData({ products: [] });
    fireEvent.click(screen.getByText(/Pushed Products/));
    expect(screen.getByText("No products pushed yet")).toBeInTheDocument();
    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
  });

  it("renders GlobalStoreChat", () => {
    renderWithData();
    const chatButton = screen.getByTitle("AI Store Assistant");
    expect(chatButton).toBeInTheDocument();
  });

  it("opens GlobalStoreChat on chat button click", () => {
    renderWithData({ connections: [makeConnection()] });
    fireEvent.click(screen.getByTitle("AI Store Assistant"));
    expect(screen.getByText("Store AI")).toBeInTheDocument();
    expect(screen.getByText("Ask anything about your stores")).toBeInTheDocument();
  });

  it("shows pushed products count in tab label", () => {
    renderWithData({ products: [makeProduct(), makeProduct({ id: "p2" })] });
    expect(screen.getByText("Pushed Products (2)")).toBeInTheDocument();
  });

  it("shows 'Your Connected Stores' heading when connections exist", () => {
    renderWithData({ connections: [makeConnection()] });
    expect(screen.getByText("Your Connected Stores")).toBeInTheDocument();
  });

  it("does not show 'Your Connected Stores' heading when no connections", () => {
    renderWithData({ connections: [] });
    expect(screen.queryByText("Your Connected Stores")).not.toBeInTheDocument();
  });

  it("renders subtitle text", () => {
    renderWithData();
    expect(screen.getByText("Connect your stores to push products directly")).toBeInTheDocument();
  });

  it("shows dashboard link when connections exist", () => {
    renderWithData({ connections: [makeConnection()] });
    expect(screen.getByText("Go to Multi-Store Dashboard")).toBeInTheDocument();
  });

  it("does not show dashboard link when no connections", () => {
    renderWithData({ connections: [] });
    expect(screen.queryByText("Go to Multi-Store Dashboard")).not.toBeInTheDocument();
  });
});

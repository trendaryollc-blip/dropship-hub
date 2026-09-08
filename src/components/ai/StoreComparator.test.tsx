import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StoreComparator from "./StoreComparator";

const mockSafeFetch = vi.fn();
vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: (...args: any[]) => mockSafeFetch(...args),
}));

vi.mock("lucide-react", () => ({
  Store: () => <div data-testid="icon" />,
  CheckCircle: () => <div data-testid="icon" />,
  AlertTriangle: () => <div data-testid="icon" />,
  XCircle: () => <div data-testid="icon" />,
  ShoppingBag: () => <div data-testid="icon" />,
  ChevronDown: () => <div data-testid="icon" />,
  ChevronUp: () => <div data-testid="icon" />,
}));

describe("StoreComparator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title", () => {
    render(<StoreComparator uid="user-1" />);
    expect(screen.getByText("Store Comparator")).toBeInTheDocument();
  });

  it("renders Compare button", () => {
    render(<StoreComparator uid="user-1" />);
    expect(screen.getByText("Compare")).toBeInTheDocument();
  });

  it("renders description when no data", () => {
    render(<StoreComparator uid="user-1" />);
    expect(screen.getByText("Compare performance across all your connected stores.")).toBeInTheDocument();
  });

  it("shows loading state when Compare clicked", async () => {
    mockSafeFetch.mockReturnValue(new Promise(() => {}));
    render(<StoreComparator uid="user-1" />);
    fireEvent.click(screen.getByText("Compare"));
    await waitFor(() => {
      expect(screen.getByText("Checking...")).toBeInTheDocument();
    });
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays stores after analysis", async () => {
    mockSafeFetch.mockResolvedValue({
      stores: [
        { id: "s1", platform: "shopify", name: "My Store", status: "connected", productsLive: 50, productsError: 2, totalPushed: 55, revenue: 5000, orders: 100, avgOrderValue: 50, healthScore: 90, healthLabel: "Healthy", issues: [] },
      ],
      comparison: { bestStore: "My Store", worstStore: "My Store", avgRevenue: 5000, avgOrders: 100, revenueDifference: 0 },
      insights: [],
    });
    render(<StoreComparator uid="user-1" />);
    fireEvent.click(screen.getByText("Compare"));
    await waitFor(() => expect(screen.getByText("My Store")).toBeInTheDocument());
  });

  it("displays empty stores message", async () => {
    mockSafeFetch.mockResolvedValue({
      stores: [],
      comparison: { bestStore: "", worstStore: "", avgRevenue: 0, avgOrders: 0, revenueDifference: 0 },
      insights: [],
    });
    render(<StoreComparator uid="user-1" />);
    fireEvent.click(screen.getByText("Compare"));
    await waitFor(() => expect(screen.getByText("No stores connected yet.")).toBeInTheDocument());
  });
});

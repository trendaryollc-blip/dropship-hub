import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SavedStatsBar from "./SavedStatsBar";

vi.mock("lucide-react", () => ({
  Heart: () => <div data-testid="icon" />,
  DollarSign: () => <div data-testid="icon" />,
  Star: () => <div data-testid="icon" />,
  Globe: () => <div data-testid="icon" />,
}));

const mockUseSavedProducts = vi.fn();
vi.mock("./SavedProductsProvider", () => ({
  useSavedProducts: () => mockUseSavedProducts(),
}));

describe("SavedStatsBar", () => {
  it("returns null when no saved products", () => {
    mockUseSavedProducts.mockReturnValue({ savedProducts: [] });
    const { container } = render(<SavedStatsBar />);
    expect(container.innerHTML).toBe("");
  });

  it("renders stats cards when products exist", () => {
    mockUseSavedProducts.mockReturnValue({
      savedProducts: [
        { id: "1", price: 20, rating: 4.0, source: "amazon" },
        { id: "2", price: 40, rating: 5.0, source: "ebay" },
      ],
    });
    render(<SavedStatsBar />);
    expect(screen.getByText("Total Saved")).toBeInTheDocument();
    expect(screen.getByText("Avg. Price")).toBeInTheDocument();
    expect(screen.getByText("Avg. Rating")).toBeInTheDocument();
    expect(screen.getByText("Top Platform")).toBeInTheDocument();
  });

  it("shows average price", () => {
    mockUseSavedProducts.mockReturnValue({
      savedProducts: [
        { id: "1", price: 20, source: "amazon" },
        { id: "2", price: 40, source: "amazon" },
      ],
    });
    render(<SavedStatsBar />);
    expect(screen.getByText("$30.00")).toBeInTheDocument();
  });

  it("shows average rating", () => {
    mockUseSavedProducts.mockReturnValue({
      savedProducts: [
        { id: "1", rating: 4.0, source: "amazon" },
        { id: "2", rating: 5.0, source: "amazon" },
      ],
    });
    render(<SavedStatsBar />);
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("shows N/A for missing price and rating data", () => {
    mockUseSavedProducts.mockReturnValue({
      savedProducts: [
        { id: "1", price: null, rating: null, source: "amazon" },
      ],
    });
    render(<SavedStatsBar />);
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThanOrEqual(2);
  });
});

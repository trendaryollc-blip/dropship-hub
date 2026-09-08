import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SavedProductCard from "./SavedProductCard";
import type { SavedProduct } from "./SavedProductsProvider";

vi.mock("lucide-react", () => ({
  Heart: () => <div data-testid="icon-heart" />,
  Star: () => <div data-testid="icon-star" />,
  Package: () => <div data-testid="icon-package" />,
  MoreVertical: () => <div data-testid="icon-more" />,
  Brain: () => <div data-testid="icon" />,
  Search: () => <div data-testid="icon" />,
  FileText: () => <div data-testid="icon" />,
  DollarSign: () => <div data-testid="icon" />,
  GitCompare: () => <div data-testid="icon" />,
  MessageSquare: () => <div data-testid="icon" />,
  Check: () => <div data-testid="icon" />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

const mockUseSavedProducts = vi.fn();
vi.mock("./SavedProductsProvider", () => ({
  useSavedProducts: () => mockUseSavedProducts(),
}));

const mockProduct: SavedProduct = {
  id: "prod-1",
  title: "Test Product Widget",
  price: 29.99,
  image: "https://example.com/img.jpg",
  link: "https://example.com",
  source: "amazon",
  rating: 4.5,
  reviews: 120,
  savedAt: Date.now() - 60000,
};

describe("SavedProductCard", () => {
  const defaultProps = {
    product: mockProduct,
    viewMode: "grid" as const,
    onAIAction: vi.fn(),
  };

  beforeEach(() => {
    mockUseSavedProducts.mockReturnValue({
      toggleSave: vi.fn(),
      isSelectMode: false,
      toggleSelect: vi.fn(),
      selectedIds: new Set(),
    });
  });

  it("renders product title", () => {
    render(<SavedProductCard {...defaultProps} />);
    expect(screen.getByText("Test Product Widget")).toBeInTheDocument();
  });

  it("shows product price in grid mode", () => {
    render(<SavedProductCard {...defaultProps} />);
    expect(screen.getByText("$29.99")).toBeInTheDocument();
  });

  it("renders in list mode", () => {
    render(<SavedProductCard {...defaultProps} viewMode="list" />);
    expect(screen.getByText("Test Product Widget")).toBeInTheDocument();
    expect(screen.getByText("$29.99")).toBeInTheDocument();
  });

  it("shows price N/A when price is null", () => {
    const product = { ...mockProduct, price: null };
    render(<SavedProductCard {...defaultProps} product={product} />);
    expect(screen.getByText("Price N/A")).toBeInTheDocument();
  });

  it("calls onAIAction when menu action clicked", () => {
    const onAIAction = vi.fn();
    render(<SavedProductCard {...defaultProps} onAIAction={onAIAction} />);
    const moreBtn = screen.getAllByRole("button").find((btn) =>
      btn.querySelector('[data-testid="icon-more"]')
    );
    fireEvent.click(moreBtn!);
    const analyzeBtn = screen.getByText("Analyze product");
    fireEvent.click(analyzeBtn);
    expect(onAIAction).toHaveBeenCalledWith("analyze", mockProduct);
  });
});

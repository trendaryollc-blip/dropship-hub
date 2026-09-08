import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EnrichedProductCard from "./EnrichedProductCard";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/components/saved/SavedProductsProvider", () => ({
  useSavedProducts: () => ({
    isSaved: () => false,
    toggleSave: vi.fn(),
  }),
}));

vi.mock("@/components/fulfillment/SupplierPicker", () => ({
  SupplierPicker: () => <div data-testid="supplier-picker" />,
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockResolvedValue({}),
}));

const mockProduct = {
  id: "prod-1",
  title: "Wireless Headphones",
  price: 29.99,
  image: "https://example.com/headphones.jpg",
  images: ["https://example.com/headphones.jpg", "https://example.com/headphones2.jpg"],
  link: "https://amazon.com/dp/B0TEST",
  source: "amazon",
  rating: 4.5,
  reviews: 1234,
};

describe("EnrichedProductCard", () => {
  it("renders product title", () => {
    render(<EnrichedProductCard product={mockProduct} index={0} />);
    expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
  });

  it("displays price", () => {
    render(<EnrichedProductCard product={mockProduct} index={0} />);
    expect(screen.getByText("$29.99")).toBeInTheDocument();
  });

  it("displays rating and reviews", () => {
    render(<EnrichedProductCard product={mockProduct} index={0} />);
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("(1,234)")).toBeInTheDocument();
  });

  it("shows source badge", () => {
    render(<EnrichedProductCard product={mockProduct} index={0} />);
    expect(screen.getByText(/amazon/)).toBeInTheDocument();
  });

  it("shows image count when multiple images", () => {
    render(<EnrichedProductCard product={mockProduct} index={0} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders product image", () => {
    render(<EnrichedProductCard product={mockProduct} index={0} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/headphones.jpg");
  });

  it("shows Price N/A when price is null", () => {
    const noPrice = { ...mockProduct, price: null };
    render(<EnrichedProductCard product={noPrice} index={0} />);
    expect(screen.getByText("Price N/A")).toBeInTheDocument();
  });

  it("renders Push to Store button", () => {
    render(<EnrichedProductCard product={mockProduct} index={0} />);
    expect(screen.getByText("Push to Store")).toBeInTheDocument();
  });

  it("opens push modal when Push to Store is clicked", () => {
    render(<EnrichedProductCard product={mockProduct} index={0} />);
    fireEvent.click(screen.getByText("Push to Store"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows no stores connected when modal opens with no stores", async () => {
    render(<EnrichedProductCard product={mockProduct} index={0} />);
    fireEvent.click(screen.getByText("Push to Store"));
    expect(await screen.findByText("No stores connected yet")).toBeInTheDocument();
  });

  it("renders save and compare buttons", () => {
    render(<EnrichedProductCard product={mockProduct} index={0} />);
    expect(screen.getByTitle("Save to favorites")).toBeInTheDocument();
    expect(screen.getByTitle("Add to compare")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ListItemCard from "./ListItemCard";

const routerState = vi.hoisted(() => ({ push: vi.fn() }));
const savedState = vi.hoisted(() => ({ isSaved: vi.fn(), toggleSave: vi.fn() }));

vi.mock("next/image", () => ({
  default: (props: { src?: string; alt?: string; [k: string]: unknown }) => <img src={props.src} alt={props.alt} />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerState.push,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/components/saved/SavedProductsProvider", () => ({
  useSavedProducts: () => ({
    isSaved: savedState.isSaved,
    toggleSave: savedState.toggleSave,
  }),
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

beforeEach(() => {
  routerState.push.mockClear();
  savedState.isSaved.mockClear().mockReturnValue(false);
  savedState.toggleSave.mockClear();
  sessionStorage.clear();
});

describe("ListItemCard", () => {
  it("renders product title", () => {
    render(<ListItemCard product={mockProduct} index={0} />);
    expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
  });

  it("displays price", () => {
    render(<ListItemCard product={mockProduct} index={0} />);
    expect(screen.getByText("$29.99")).toBeInTheDocument();
  });

  it("displays rating", () => {
    render(<ListItemCard product={mockProduct} index={0} />);
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("displays reviews count", () => {
    render(<ListItemCard product={mockProduct} index={0} />);
    expect(screen.getByText("(1,234)")).toBeInTheDocument();
  });

  it("shows source name", () => {
    render(<ListItemCard product={mockProduct} index={0} />);
    expect(screen.getByText(/amazon/)).toBeInTheDocument();
  });

  it("shows image count badge for multiple images", () => {
    render(<ListItemCard product={mockProduct} index={0} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders product image", () => {
    render(<ListItemCard product={mockProduct} index={0} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/headphones.jpg");
  });

  it("shows N/A when price is null", () => {
    const noPrice = { ...mockProduct, price: null };
    render(<ListItemCard product={noPrice} index={0} />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("links to product page", () => {
    render(<ListItemCard product={mockProduct} index={0} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/products/prod-1");
  });

  it("navigates with query params and reports the click", () => {
    const onProductClick = vi.fn();
    render(<ListItemCard product={mockProduct} index={0} onProductClick={onProductClick} />);

    fireEvent.click(screen.getByRole("link"));

    expect(routerState.push).toHaveBeenCalledWith(
      expect.stringContaining("/products/prod-1?")
    );
    const url = routerState.push.mock.calls[0][0] as string;
    expect(url).toContain("t=Wireless+Headphones");
    expect(url).toContain("src=amazon");
    expect(url).toContain("p=29.99");
    expect(url).toContain("r=4.5");
    expect(url).toContain("rev=1234");
    expect(onProductClick).toHaveBeenCalledWith(mockProduct);
    expect(JSON.parse(sessionStorage.getItem("selectedProduct") || "{}").id).toBe("prod-1");
  });

  it("toggles save with the product payload", () => {
    render(<ListItemCard product={mockProduct} index={0} />);

    fireEvent.click(screen.getByTitle("Save to favorites"));

    expect(savedState.toggleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "prod-1",
        title: "Wireless Headphones",
        price: 29.99,
        image: "https://example.com/headphones.jpg",
        link: "https://amazon.com/dp/B0TEST",
        source: "amazon",
        rating: 4.5,
        reviews: 1234,
      })
    );
  });

  it("shows the saved state and does not navigate when saving", () => {
    savedState.isSaved.mockReturnValue(true);
    render(<ListItemCard product={mockProduct} index={0} />);

    expect(screen.getByTitle("Remove from favorites")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Remove from favorites"));
    expect(savedState.toggleSave).toHaveBeenCalledTimes(1);
    expect(routerState.push).not.toHaveBeenCalled();
  });

  it("selects and deselects the product for quick actions", () => {
    const onSelectForActions = vi.fn();
    const { rerender } = render(
      <ListItemCard product={mockProduct} index={0} onSelectForActions={onSelectForActions} />
    );

    fireEvent.click(screen.getByTitle("Select product for actions"));
    expect(onSelectForActions).toHaveBeenCalledWith("prod-1");

    rerender(
      <ListItemCard product={mockProduct} index={0} onSelectForActions={onSelectForActions} selectedForActions />
    );
    expect(screen.getByTitle("Deselect product")).toBeInTheDocument();
  });
});
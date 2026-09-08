import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ListItemCard from "./ListItemCard";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
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
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CategoryCard from "./CategoryCard";
import type { ProductCategory } from "@/types/products-types";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

const mockCategory: ProductCategory = {
  id: "cat-1",
  name: "Electronics",
  icon: "Cpu",
  image: "https://example.com/electronics.jpg",
  color: "#3b82f6",
  gradient: "from-blue-500 to-cyan-500",
  productCount: 1234,
  avgMargin: 25.5,
  trending: true,
};

describe("CategoryCard", () => {
  it("renders category name", () => {
    render(<CategoryCard category={mockCategory} index={0} />);
    expect(screen.getByText("Electronics")).toBeInTheDocument();
  });

  it("displays product count", () => {
    render(<CategoryCard category={mockCategory} index={0} />);
    expect(screen.getByText("1,234 products")).toBeInTheDocument();
  });

  it("displays average margin", () => {
    render(<CategoryCard category={mockCategory} index={0} />);
    expect(screen.getByText("~25.5% margin")).toBeInTheDocument();
  });

  it("shows Hot badge when trending", () => {
    render(<CategoryCard category={mockCategory} index={0} />);
    expect(screen.getByText("Hot")).toBeInTheDocument();
  });

  it("hides Hot badge when not trending", () => {
    const nonTrending = { ...mockCategory, trending: false };
    render(<CategoryCard category={nonTrending} index={0} />);
    expect(screen.queryByText("Hot")).not.toBeInTheDocument();
  });

  it("links to products page with category name", () => {
    render(<CategoryCard category={mockCategory} index={0} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/products?q=Electronics");
  });

  it("renders the category image", () => {
    render(<CategoryCard category={mockCategory} index={0} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/electronics.jpg");
    expect(img).toHaveAttribute("alt", "Electronics");
  });
});

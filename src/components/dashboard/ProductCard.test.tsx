import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductCard from "./ProductCard";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("lucide-react", () => ({
  TrendingUp: () => <div />,
  Star: () => <div />,
  AlertTriangle: () => <div />,
  Zap: () => <div />,
  ArrowUpRight: () => <div />,
}));

const mockProduct = {
  id: "p1",
  title: "Wireless Earbuds Pro",
  description: "Great earbuds",
  category: "Electronics",
  images: ["/earbuds.jpg"],
  platformPrices: [
    { platform: "aliexpress", price: 10, url: "https://ali.com", inStock: true, rating: 4.5, reviews: 100 },
    { platform: "amazon", price: 25, url: "https://amazon.com", inStock: true, rating: 4.2, reviews: 50 },
  ],
  suppliers: [],
  trending: true,
  riskScore: 20,
  profitPotential: "high" as const,
  competitionLevel: "low" as const,
  searchVolume: 5000,
  averageRating: 4.3,
  totalReviews: 150,
  marketTrend: "rising" as const,
  seasonality: "year-round",
  tags: ["trending"],
};

describe("ProductCard", () => {
  it("renders product title", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("Wireless Earbuds Pro")).toBeDefined();
  });

  it("renders price", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("$10.00")).toBeDefined();
  });

  it("renders rating", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("4.3")).toBeDefined();
    expect(screen.getByText("(150 reviews)")).toBeDefined();
  });

  it("renders risk badge", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText(/Risk 20/)).toBeDefined();
  });

  it("link to product page", () => {
    render(<ProductCard product={mockProduct} />);
    const link = screen.getByText("Wireless Earbuds Pro").closest("a");
    expect(link).toHaveAttribute("href", "/products/p1");
  });
});

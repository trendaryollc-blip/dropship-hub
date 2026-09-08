import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NicheQuickCard from "./NicheQuickCard";
import type { NicheQuickCard as NicheQuickCardType } from "@/types/products-types";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

const mockNiche: NicheQuickCardType = {
  name: "Wireless Earbuds",
  icon: "Headphones",
  image: "https://example.com/earbuds.jpg",
  query: "wireless earbuds",
  productCount: 543,
  avgPrice: "$29.99",
  trend: "up",
  trendPercent: 15.3,
  color: "#10b981",
};

describe("NicheQuickCard", () => {
  it("renders niche name", () => {
    render(<NicheQuickCard niche={mockNiche} index={0} />);
    expect(screen.getByText("Wireless Earbuds")).toBeInTheDocument();
  });

  it("displays product count", () => {
    render(<NicheQuickCard niche={mockNiche} index={0} />);
    expect(screen.getByText("543 products")).toBeInTheDocument();
  });

  it("displays average price", () => {
    render(<NicheQuickCard niche={mockNiche} index={0} />);
    expect(screen.getByText("$29.99")).toBeInTheDocument();
  });

  it("shows positive trend percent with + prefix", () => {
    render(<NicheQuickCard niche={mockNiche} index={0} />);
    expect(screen.getByText("+15.3%")).toBeInTheDocument();
  });

  it("shows negative trend percent without + prefix", () => {
    const downNiche = { ...mockNiche, trend: "down" as const, trendPercent: -8.2 };
    render(<NicheQuickCard niche={downNiche} index={0} />);
    expect(screen.getByText("-8.2%")).toBeInTheDocument();
  });

  it("shows 0% for stable trend with no sign", () => {
    const stableNiche = { ...mockNiche, trend: "stable" as const, trendPercent: 0 };
    render(<NicheQuickCard niche={stableNiche} index={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("links to products page with niche query", () => {
    render(<NicheQuickCard niche={mockNiche} index={0} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/products?q=wireless%20earbuds");
  });

  it("renders the niche image", () => {
    render(<NicheQuickCard niche={mockNiche} index={0} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/earbuds.jpg");
    expect(img).toHaveAttribute("alt", "Wireless Earbuds");
  });
});

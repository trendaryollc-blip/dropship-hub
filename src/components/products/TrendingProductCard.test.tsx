import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TrendingProductCard from "./TrendingProductCard";
import type { TrendingSearchProduct } from "@/types/products-types";

vi.mock("next/link", () => ({
  default: (props: any) => <a {...props}>{props.children}</a>,
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

vi.mock("./MiniSparkline", () => ({
  default: () => <div data-testid="sparkline" />,
}));

vi.mock("./ScoreRing", () => ({
  default: () => <div data-testid="score-ring" />,
}));

const mockProduct: TrendingSearchProduct = {
  id: "prod-1",
  name: "Wireless Mouse",
  category: "Electronics",
  price: 15.99,
  sellPrice: 34.99,
  profit: 19.0,
  margin: 54,
  platform: "Amazon",
  trend: 25,
  sparkline: [10, 20, 15, 30, 25, 40],
  confidence: 85,
  demandLevel: "high",
  competitionLevel: "low",
  image: "https://example.com/mouse.jpg",
  tags: ["trending"],
};

describe("TrendingProductCard", () => {
  it("renders product name", () => {
    render(<TrendingProductCard product={mockProduct} index={0} rank={1} />);
    expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
  });

  it("displays rank number", () => {
    render(<TrendingProductCard product={mockProduct} index={0} rank={3} />);
    expect(screen.getByText("#3")).toBeInTheDocument();
  });

  it("displays profit", () => {
    render(<TrendingProductCard product={mockProduct} index={0} rank={1} />);
    expect(screen.getByText("$19.00")).toBeInTheDocument();
  });

  it("displays margin percentage", () => {
    render(<TrendingProductCard product={mockProduct} index={0} rank={1} />);
    expect(screen.getByText("margin 54%")).toBeInTheDocument();
  });

  it("displays platform", () => {
    render(<TrendingProductCard product={mockProduct} index={0} rank={1} />);
    expect(screen.getByText("Amazon")).toBeInTheDocument();
  });

  it("displays demand level label", () => {
    render(<TrendingProductCard product={mockProduct} index={0} rank={1} />);
    expect(screen.getByText("High demand")).toBeInTheDocument();
  });

  it("displays competition level label", () => {
    render(<TrendingProductCard product={mockProduct} index={0} rank={1} />);
    expect(screen.getByText("Low comp")).toBeInTheDocument();
  });

  it("displays trend percentage", () => {
    render(<TrendingProductCard product={mockProduct} index={0} rank={1} />);
    expect(screen.getByText("+25%")).toBeInTheDocument();
  });

  it("expands on click to show details", () => {
    render(<TrendingProductCard product={mockProduct} index={0} rank={1} />);
    fireEvent.click(screen.getByText("Wireless Mouse"));
    expect(screen.getByText("Source Price")).toBeInTheDocument();
    expect(screen.getByText("$15.99")).toBeInTheDocument();
    expect(screen.getByText("Sell Price")).toBeInTheDocument();
    expect(screen.getByText("$34.99")).toBeInTheDocument();
  });

  it("shows AI Score when expanded", () => {
    render(<TrendingProductCard product={mockProduct} index={0} rank={1} />);
    fireEvent.click(screen.getByText("Wireless Mouse"));
    expect(screen.getByText("AI Score: 85/100")).toBeInTheDocument();
  });

  it("shows Search This Product link when expanded", () => {
    render(<TrendingProductCard product={mockProduct} index={0} rank={1} />);
    fireEvent.click(screen.getByText("Wireless Mouse"));
    expect(screen.getByText("Search This Product")).toBeInTheDocument();
  });

  it("renders product image when provided", () => {
    render(<TrendingProductCard product={mockProduct} index={0} rank={1} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/mouse.jpg");
  });

  it("shows Package icon when no image", () => {
    const noImg = { ...mockProduct, image: "" };
    render(<TrendingProductCard product={noImg} index={0} rank={1} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

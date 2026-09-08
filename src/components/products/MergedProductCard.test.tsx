import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MergedProductCard from "./MergedProductCard";
import type { EnrichedProduct } from "@/lib/search/enrichment";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("lucide-react", () => ({
  Package: (props: any) => <div data-testid="icon-package" {...props} />,
  Heart: (props: any) => <div data-testid="icon-heart" {...props} />,
  Star: (props: any) => <div data-testid="icon-star" {...props} />,
  ChevronDown: (props: any) => <div data-testid="icon-chevron" {...props} />,
  Store: (props: any) => <div data-testid="icon-store" {...props} />,
  GitCompare: (props: any) => <div data-testid="icon-compare" {...props} />,
  TrendingUp: (props: any) => <div data-testid="icon-trending" {...props} />,
  BarChart3: (props: any) => <div data-testid="icon-chart" {...props} />,
  AlertTriangle: (props: any) => <div data-testid="icon-alert" {...props} />,
  Check: (props: any) => <div data-testid="icon-check" {...props} />,
  ExternalLink: (props: any) => <div data-testid="icon-link" {...props} />,
}));

function makeEnriched(overrides: Partial<EnrichedProduct> = {}): EnrichedProduct {
  return {
    id: "merged-1",
    title: "Wireless Bluetooth Earbuds Pro",
    image: "https://img.com/earbuds.jpg",
    images: ["https://img.com/earbuds.jpg"],
    platforms: [
      { platform: "amazon", price: 29.99, link: "https://amazon.com/1", originalTitle: "Wireless Earbuds" },
      { platform: "aliexpress", price: 9.99, link: "https://aliexpress.com/1", originalTitle: "BT Earbuds" },
    ],
    bestPrice: 9.99,
    worstPrice: 29.99,
    priceSpread: 200,
    avgPrice: 19.99,
    platformCount: 2,
    bestPlatform: "aliexpress",
    rating: 4.5,
    reviews: 2500,
    brand: "TestBrand",
    goldenScore: 75,
    goldenRank: "A",
    estimatedMargin: 45,
    trendPhase: "growth",
    saturationLevel: "low",
    competitionScore: 40,
    reviewVelocity: 100,
    priceStability: 70,
    supplyChainScore: 80,
    ...overrides,
  };
}

describe("MergedProductCard", () => {
  it("renders product title", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    expect(screen.getByText("Wireless Bluetooth Earbuds Pro")).toBeInTheDocument();
  });

  it("renders best price", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    expect(screen.getByText("$9.99")).toBeInTheDocument();
  });

  it("renders worst price as strikethrough", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    expect(screen.getByText("$29.99")).toBeInTheDocument();
  });

  it("renders platform count badge", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    expect(screen.getByText(/2 platforms/)).toBeInTheDocument();
  });

  it("renders golden score badge", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    expect(screen.getByTestId("golden-score-badge")).toBeInTheDocument();
  });

  it("renders trend phase indicator", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    expect(screen.getByText("Growing")).toBeInTheDocument();
  });

  it("renders saturation indicator", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    expect(screen.getByText("Low Sat.")).toBeInTheDocument();
  });

  it("renders estimated margin badge", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    expect(screen.getByText(/45%/)).toBeInTheDocument();
  });

  it("renders rating and reviews", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("(2,500)")).toBeInTheDocument();
  });

  it("shows price spread warning", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    expect(screen.getByText(/200% price spread/)).toBeInTheDocument();
  });

  it("shows best platform", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    expect(screen.getByText(/Best on/)).toBeInTheDocument();
  });

  it("shows expandable price comparison", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    expect(screen.getByText(/Compare 2 prices/)).toBeInTheDocument();
  });

  it("expands price comparison on click", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    fireEvent.click(screen.getByText(/Compare 2 prices/));
    expect(screen.getByTestId("platform-price-row")).toBeInTheDocument();
  });

  it("calls onSave when save clicked", () => {
    const onSave = vi.fn();
    render(<MergedProductCard product={makeEnriched()} onSave={onSave} />);
    fireEvent.click(screen.getByTitle("Save to favorites"));
    expect(onSave).toHaveBeenCalled();
  });

  it("calls onCompare when compare clicked", () => {
    const onCompare = vi.fn();
    render(<MergedProductCard product={makeEnriched()} onCompare={onCompare} />);
    fireEvent.click(screen.getByTitle("Add to compare"));
    expect(onCompare).toHaveBeenCalled();
  });

  it("shows Price N/A when bestPrice is null", () => {
    render(<MergedProductCard product={makeEnriched({ bestPrice: null, worstPrice: null })} />);
    expect(screen.getByText("Price N/A")).toBeInTheDocument();
  });

  it("shows no price spread when spread is 0", () => {
    render(<MergedProductCard product={makeEnriched({ priceSpread: 0 })} />);
    expect(screen.queryByText(/price spread/)).not.toBeInTheDocument();
  });

  it("renders image", () => {
    render(<MergedProductCard product={makeEnriched()} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://img.com/earbuds.jpg");
  });

  it("renders placeholder when no image", () => {
    render(<MergedProductCard product={makeEnriched({ image: null })} />);
    expect(screen.getByTestId("icon-package")).toBeInTheDocument();
  });
});

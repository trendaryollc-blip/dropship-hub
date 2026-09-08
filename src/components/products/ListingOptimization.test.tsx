import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ListingOptimization from "./ListingOptimization";
import type { ListingSuggestion } from "@/types/enrichment";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

const mockData: ListingSuggestion = {
  title: "Premium Wireless Headphones - Bluetooth 5.0",
  description: "Experience crystal-clear audio with our premium wireless headphones.",
  tags: ["wireless", "bluetooth", "headphones", "audio"],
  suggestedPriceRange: "$29.99 - $49.99",
  platformTips: [
    { platform: "Amazon", tip: "Use high-quality images and A+ content" },
    { platform: "Shopify", tip: "Create urgency with limited-time offers" },
  ],
};

describe("ListingOptimization", () => {
  it("renders heading", () => {
    render(<ListingOptimization data={mockData} />);
    expect(screen.getByText("Listing Optimization")).toBeInTheDocument();
  });

  it("displays suggested title", () => {
    render(<ListingOptimization data={mockData} />);
    expect(screen.getByText("Premium Wireless Headphones - Bluetooth 5.0")).toBeInTheDocument();
  });

  it("displays description", () => {
    render(<ListingOptimization data={mockData} />);
    expect(screen.getByText(/Experience crystal-clear audio/)).toBeInTheDocument();
  });

  it("shows suggested tags", () => {
    render(<ListingOptimization data={mockData} />);
    expect(screen.getByText("wireless")).toBeInTheDocument();
    expect(screen.getByText("bluetooth")).toBeInTheDocument();
  });

  it("displays price range", () => {
    render(<ListingOptimization data={mockData} />);
    expect(screen.getByText("$29.99 - $49.99")).toBeInTheDocument();
  });

  it("shows platform tip", () => {
    render(<ListingOptimization data={mockData} platform="Amazon" />);
    expect(screen.getByText(/Use high-quality images/)).toBeInTheDocument();
  });

  it("shows empty state when data is null", () => {
    render(<ListingOptimization data={null} />);
    expect(screen.getByText("Listing suggestions unavailable")).toBeInTheDocument();
  });

  it("shows copy buttons", () => {
    render(<ListingOptimization data={mockData} />);
    const copyBtns = screen.getAllByTitle("Copy to clipboard");
    expect(copyBtns.length).toBeGreaterThanOrEqual(1);
  });

  it("shows section labels", () => {
    render(<ListingOptimization data={mockData} />);
    expect(screen.getByText("Suggested Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Suggested Tags")).toBeInTheDocument();
  });
});

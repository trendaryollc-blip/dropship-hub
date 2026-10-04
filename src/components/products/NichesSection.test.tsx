import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import NichesSection from "./NichesSection";

const apiState = vi.hoisted(() => ({
  data: undefined as unknown,
  isLoading: false,
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: apiState.data, isLoading: apiState.isLoading, error: undefined }),
}));
vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));
vi.mock("next/image", () => ({
  default: (props: { src?: string; alt?: string; [k: string]: unknown }) => (
    <img src={props.src} alt={props.alt} />
  ),
}));

const niche = {
  id: "n1",
  name: "Home & Garden",
  icon: "🏡",
  image: "https://img.example.com/niche.jpg",
  category: "home",
  heat: 92,
  productCount: 4312,
  avgMargin: 35,
  growth: 8,
  trend: "up",
  avgSellingPrice: 27.4,
};

describe("NichesSection", () => {
  beforeEach(() => {
    apiState.data = undefined;
    apiState.isLoading = false;
  });

  it("shows skeletons while loading", () => {
    apiState.isLoading = true;
    const { container } = render(<NichesSection />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText("No niche data available")).not.toBeInTheDocument();
  });

  it("shows setup guidance when the API falls back without a CJ key", () => {
    apiState.data = {
      isFallback: true,
      reason: "CJ Dropshipping API key is not configured.",
    };
    render(<NichesSection />);

    expect(screen.getByTestId("data-unavailable")).toBeInTheDocument();
    expect(screen.getByText("Niches require CJ API")).toBeInTheDocument();
    expect(screen.getByText("CJ Dropshipping API key is not configured.")).toBeInTheDocument();
    expect(screen.queryByText("View all")).not.toBeInTheDocument();
  });

  it("shows an empty message when there are no niches", () => {
    apiState.data = { niches: [] };
    render(<NichesSection />);
    expect(screen.getByText("No niche data available")).toBeInTheDocument();
  });

  it("renders live niches with a Live API badge and search links", () => {
    apiState.data = { niches: [niche] };
    render(<NichesSection />);

    expect(screen.getByRole("heading", { name: "Popular Niches" })).toBeInTheDocument();
    expect(screen.getByText("Live API")).toBeInTheDocument();
    expect(screen.getByText("4312 products")).toBeInTheDocument();
    expect(screen.getByText("$27 avg")).toBeInTheDocument();
    expect(screen.getByText("+8%")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Home & Garden/ });
    expect(link).toHaveAttribute("href", "/products?q=Home%20%26%20Garden");
    expect(screen.getByRole("link", { name: /View all/ })).toHaveAttribute(
      "href",
      "/products/niches"
    );
  });

  it("caps the grid at eight niches", () => {
    apiState.data = {
      niches: Array.from({ length: 12 }, (_, i) => ({
        ...niche,
        id: `n${i}`,
        name: `Niche ${i}`,
      })),
    };
    const { container } = render(<NichesSection />);
    expect(container.querySelectorAll('a[href^="/products?q="]')).toHaveLength(8);
  });
});

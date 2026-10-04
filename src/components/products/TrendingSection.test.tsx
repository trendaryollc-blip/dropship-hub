import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TrendingSection from "./TrendingSection";

const apiState = vi.hoisted(() => ({
  data: undefined as unknown,
  isLoading: false,
}));
const routerPush = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: apiState.data, isLoading: apiState.isLoading, error: undefined }),
}));
vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("next/image", () => ({
  default: (props: { src?: string; alt?: string; [k: string]: unknown }) => (
    <img src={props.src} alt={props.alt} />
  ),
}));

const trendingProduct = {
  id: "t1",
  name: "Wireless Earbuds Pro",
  fullName: "Wireless Earbuds Pro Max",
  category: "electronics",
  price: 24.99,
  sellPrice: 49.99,
  profit: 25,
  margin: 50,
  platform: "Amazon",
  platformId: "amazon",
  link: "https://amazon.com/dp/X",
  trend: 12,
  sparkline: [1, 2, 3],
  confidence: 78,
  demandLevel: "high",
  competitionLevel: "low",
  image: "https://img.example.com/1.jpg",
  tags: ["audio"],
  rating: 4.5,
  reviews: 1200,
};

describe("TrendingSection", () => {
  beforeEach(() => {
    apiState.data = undefined;
    apiState.isLoading = false;
    routerPush.mockClear();
    sessionStorage.clear();
  });

  it("shows skeletons while loading", () => {
    apiState.isLoading = true;
    const { container } = render(<TrendingSection />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("No live search results available right now")
    ).not.toBeInTheDocument();
  });

  it("shows an empty message when there are no live results", () => {
    render(<TrendingSection />);
    expect(
      screen.getByText("No live search results available right now")
    ).toBeInTheDocument();
    expect(screen.getByText("Try searching for products above")).toBeInTheDocument();
  });

  it("renders live results with honest estimated labels", () => {
    apiState.data = { products: [trendingProduct] };
    const { container } = render(<TrendingSection />);

    expect(screen.getByRole("heading", { name: "Fresh from live search" })).toBeInTheDocument();
    expect(screen.getByText("Latest live search results (price ascending)")).toBeInTheDocument();
    expect(screen.getByText("1 live")).toBeInTheDocument();
    expect(screen.getByText("$24.99")).toBeInTheDocument();
    expect(screen.getByText("50% est.")).toBeInTheDocument();
    expect(screen.getByText("78 est.")).toBeInTheDocument();
    // Confidence must be labeled as an estimate, never an AI prediction.
    expect(
      container.querySelector('[title="Estimated score from live search signals — not an AI market prediction"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[title="Estimated margin — enter real COGS in the calculator for accuracy"]')
    ).toBeInTheDocument();
    expect(screen.getByText("Amazon")).toBeInTheDocument();
  });

  it("navigates to the product detail page when a card is opened", () => {
    apiState.data = { products: [trendingProduct] };
    render(<TrendingSection />);

    fireEvent.click(screen.getAllByRole("button", { name: "View Wireless Earbuds Pro" })[0]);

    expect(routerPush).toHaveBeenCalledTimes(1);
    const target = routerPush.mock.calls[0][0] as string;
    expect(target.startsWith("/products/t1?")).toBe(true);
    expect(target).toContain("t=Wireless+Earbuds+Pro+Max");
    expect(target).toContain("src=amazon");

    const saved = JSON.parse(sessionStorage.getItem("selectedProduct") as string);
    expect(saved.id).toBe("t1");
    expect(saved.link).toBe("https://amazon.com/dp/X");
  });
});

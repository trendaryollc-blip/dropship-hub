import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CategoriesSection from "./CategoriesSection";

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

const category = {
  id: "c1",
  name: "Home & Garden",
  icon: "🏡",
  image: "https://img.example.com/cat.jpg",
  productCount: 12345,
  avgMargin: null,
  trending: true,
  query: "home garden",
};

describe("CategoriesSection", () => {
  beforeEach(() => {
    apiState.data = undefined;
    apiState.isLoading = false;
  });

  it("shows skeletons while loading", () => {
    apiState.isLoading = true;
    const { container } = render(<CategoriesSection />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText("No category data available")).not.toBeInTheDocument();
  });

  it("shows an empty message when there are no categories", () => {
    apiState.data = { categories: [] };
    render(<CategoriesSection />);
    expect(screen.getByText("No category data available")).toBeInTheDocument();
  });

  it("renders categories with a Live API badge and search links", () => {
    apiState.data = { categories: [category] };
    render(<CategoriesSection />);

    expect(screen.getByRole("heading", { name: "Browse by Category" })).toBeInTheDocument();
    expect(screen.getByText("Live API")).toBeInTheDocument();
    expect(screen.getByText("12,345 products")).toBeInTheDocument();
    expect(screen.getByText("margin n/a")).toBeInTheDocument();
    expect(screen.getByText("Hot")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Home & Garden/ });
    expect(link).toHaveAttribute("href", "/products?q=home%20garden");
  });

  it("labels uncomputed margins honestly instead of inventing numbers", () => {
    apiState.data = { categories: [category] };
    render(<CategoriesSection />);

    expect(screen.getByTestId("coming-soon")).toBeInTheDocument();
    expect(screen.getByText("Category margins")).toBeInTheDocument();
    expect(screen.queryByText(/\d+% margin/)).not.toBeInTheDocument();
  });
});

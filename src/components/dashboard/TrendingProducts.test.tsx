import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TrendingProducts from "./TrendingProducts";
import type { TrendingProduct } from "@/types/dashboard";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

const makeProduct = (overrides: Partial<TrendingProduct> = {}): TrendingProduct => ({
  name: "Wireless Earbuds Pro",
  platform: "AliExpress",
  image: "/earbuds.jpg",
  price: 12.99,
  sellPrice: 32.99,
  profit: 20,
  margin: 61,
  trend: 15,
  sparkline: [10, 15, 20, 25, 30, 35, 40],
  confidence: 87,
  whyTrending: "High demand in audio accessories.",
  demandLevel: "high",
  competitionLevel: "medium",
  supplierReliability: 92,
  monthlyVolume: 1500,
  shippingDays: "7-15",
  sourceUrl: "https://example.com",
  competitors: [{ name: "Competitor A", price: 14.99 }],
  listingSuggestion: { title: "Premium Wireless Earbuds", description: "High-quality audio." },
  ...overrides,
});

describe("TrendingProducts", () => {
  it("renders trending products heading", () => {
    render(<TrendingProducts products={[makeProduct()]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("Trending Products")).toBeInTheDocument();
  });

  it("renders product count badge", () => {
    render(<TrendingProducts products={[makeProduct(), makeProduct({ name: "Product 2" })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("2 hot")).toBeInTheDocument();
  });

  it("renders product names", () => {
    render(<TrendingProducts products={[makeProduct()]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("Wireless Earbuds Pro")).toBeInTheDocument();
  });

  it("renders product prices", () => {
    render(<TrendingProducts products={[makeProduct({ price: 25.50 })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("$25.50")).toBeInTheDocument();
  });

  it("renders demand level badges", () => {
    render(<TrendingProducts products={[makeProduct({ demandLevel: "high" })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("Hot")).toBeInTheDocument();
  });

  it("renders margin percentage", () => {
    render(<TrendingProducts products={[makeProduct({ margin: 61 })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("61%")).toBeInTheDocument();
  });

  it("renders AI Score", () => {
    render(<TrendingProducts products={[makeProduct({ confidence: 87 })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("calls onAddCompare when compare button clicked", () => {
    const onAddCompare = vi.fn();
    render(<TrendingProducts products={[makeProduct()]} onAddCompare={onAddCompare} />);
    const addButtons = screen.getAllByTitle("Add to compare");
    fireEvent.click(addButtons[0]);
    expect(onAddCompare).toHaveBeenCalled();
  });

  it("renders View all link", () => {
    render(<TrendingProducts products={[makeProduct()]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("View all")).toBeInTheDocument();
  });

  it("renders empty product list", () => {
    render(<TrendingProducts products={[]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("Trending Products")).toBeInTheDocument();
    expect(screen.getByText("0 hot")).toBeInTheDocument();
  });

  it("renders profit amount", () => {
    render(<TrendingProducts products={[makeProduct({ profit: 20 })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("Wireless Earbuds Pro")).toBeInTheDocument();
  });

  it("renders sell price", () => {
    render(<TrendingProducts products={[makeProduct({ sellPrice: 32.99 })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("Wireless Earbuds Pro")).toBeInTheDocument();
  });

  it("renders low demand level as not Hot", () => {
    const { container } = render(<TrendingProducts products={[makeProduct({ demandLevel: "low" })]} onAddCompare={vi.fn()} />);
    expect(container.querySelector(".bg-emerald-400\\/10")).toBeNull();
  });

  it("renders medium demand level as not Hot", () => {
    const { container } = render(<TrendingProducts products={[makeProduct({ demandLevel: "medium" })]} onAddCompare={vi.fn()} />);
    expect(container.querySelector(".bg-emerald-400\\/10")).toBeNull();
  });

  it("renders platform name", () => {
    render(<TrendingProducts products={[makeProduct({ platform: "CJ" })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("CJ")).toBeInTheDocument();
  });

  it("renders confidence score", () => {
    render(<TrendingProducts products={[makeProduct({ confidence: 92 })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("92")).toBeInTheDocument();
  });

  it("renders dots indicator when more than 3 products", () => {
    const products = [
      makeProduct({ name: "P1" }),
      makeProduct({ name: "P2" }),
      makeProduct({ name: "P3" }),
      makeProduct({ name: "P4" }),
    ];
    const { container } = render(<TrendingProducts products={products} onAddCompare={vi.fn()} />);
    const dotsContainer = container.querySelector("[class*='justify-center'][class*='mt-4']");
    expect(dotsContainer).toBeInTheDocument();
    const dotButtons = dotsContainer!.querySelectorAll("button");
    expect(dotButtons.length).toBe(2);
  });

  it("does not render dots indicator when 3 or fewer products", () => {
    const products = [makeProduct({ name: "P1" }), makeProduct({ name: "P2" }), makeProduct({ name: "P3" })];
    const { container } = render(<TrendingProducts products={products} onAddCompare={vi.fn()} />);
    const dotsContainer = container.querySelector("[class*='justify-center'][class*='mt-4']");
    expect(dotsContainer).toBeNull();
  });

  it("clicking a dot navigates to that index", () => {
    const products = [
      makeProduct({ name: "P1" }),
      makeProduct({ name: "P2" }),
      makeProduct({ name: "P3" }),
      makeProduct({ name: "P4" }),
      makeProduct({ name: "P5" }),
    ];
    const { container } = render(<TrendingProducts products={products} onAddCompare={vi.fn()} />);
    const dotsContainer = container.querySelector("[class*='justify-center'][class*='mt-4']");
    const dotButtons = dotsContainer!.querySelectorAll("button");
    fireEvent.click(dotButtons[1]);
    expect(dotButtons[1]).toHaveClass("w-6");
  });

  it("prev button has active style when navigated forward", () => {
    const products = [
      makeProduct({ name: "P1" }),
      makeProduct({ name: "P2" }),
      makeProduct({ name: "P3" }),
      makeProduct({ name: "P4" }),
    ];
    const { container } = render(<TrendingProducts products={products} onAddCompare={vi.fn()} />);
    const navButtons = container.querySelectorAll("button[class*='shrink-0']");
    const nextBtn = navButtons[1];
    fireEvent.click(nextBtn);
    const prevBtn = navButtons[0];
    expect(prevBtn.className).toContain("hover:bg-surface-hover");
  });

  it("next button has active style when not at end", () => {
    const products = [
      makeProduct({ name: "P1" }),
      makeProduct({ name: "P2" }),
      makeProduct({ name: "P3" }),
      makeProduct({ name: "P4" }),
    ];
    const { container } = render(<TrendingProducts products={products} onAddCompare={vi.fn()} />);
    const navButtons = container.querySelectorAll("button[class*='shrink-0']");
    expect(navButtons[1].className).toContain("hover:bg-surface-hover");
  });

  it("toggles save state on product", () => {
    const { container } = render(<TrendingProducts products={[makeProduct()]} onAddCompare={vi.fn()} />);
    const saveBtns = container.querySelectorAll("button");
    const saveBtn = Array.from(saveBtns).find((b) => b.querySelector("svg"));
    expect(saveBtn).toBeInTheDocument();
  });

  it("renders Package icon when no image provided", () => {
    const { container } = render(
      <TrendingProducts products={[makeProduct({ image: "" })]} onAddCompare={vi.fn()} />
    );
    expect(screen.getByText("Wireless Earbuds Pro")).toBeInTheDocument();
  });

  it("toggles save on and off", () => {
    const { container } = render(<TrendingProducts products={[makeProduct()]} onAddCompare={vi.fn()} />);
    const saveBtn = container.querySelector("button.absolute");
    expect(saveBtn).toBeInTheDocument();
    fireEvent.click(saveBtn!);
    fireEvent.click(saveBtn!);
    expect(saveBtn).toBeInTheDocument();
  });

  it("renders products tracked count", () => {
    render(<TrendingProducts products={[makeProduct(), makeProduct({ name: "P2" })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("2 products tracked")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StickyProductBar from "./StickyProductBar";

vi.mock("lucide-react", () => ({
  Star: (props: any) => <div data-testid="icon-star" {...props} />,
  ShoppingCart: (props: any) => <div data-testid="icon-cart" {...props} />,
  ExternalLink: (props: any) => <div data-testid="icon-external" {...props} />,
}));

const mockHeroRef = { current: document.createElement("div") };

const defaultProps = {
  title: "Wireless Earbuds Pro",
  price: 29.99,
  image: "https://example.com/img.jpg",
  rating: 4.5,
  reviews: 1234,
  source: "amazon",
  link: "https://amazon.com/product/123",
  heroRef: mockHeroRef as any,
};

describe("StickyProductBar", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(<StickyProductBar {...defaultProps} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders product info when visible", () => {
    const { container } = render(<StickyProductBar {...defaultProps} />);
    const bar = container.querySelector(".fixed.top-0");
    if (bar) {
      expect(screen.getByText("Wireless Earbuds Pro")).toBeInTheDocument();
    }
  });

  it("shows price when visible", () => {
    const { container } = render(<StickyProductBar {...defaultProps} />);
    const bar = container.querySelector(".fixed.top-0");
    if (bar) {
      expect(screen.getByText("$29.99")).toBeInTheDocument();
    }
  });

  it("shows rating when visible", () => {
    const { container } = render(<StickyProductBar {...defaultProps} />);
    const bar = container.querySelector(".fixed.top-0");
    if (bar) {
      expect(screen.getByText("4.5")).toBeInTheDocument();
    }
  });

  it("shows reviews count when visible", () => {
    const { container } = render(<StickyProductBar {...defaultProps} />);
    const bar = container.querySelector(".fixed.top-0");
    if (bar) {
      expect(screen.getByText("(1,234)")).toBeInTheDocument();
    }
  });

  it("renders link to product", () => {
    const { container } = render(<StickyProductBar {...defaultProps} />);
    const bar = container.querySelector(".fixed.top-0");
    if (bar) {
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "https://amazon.com/product/123");
      expect(link).toHaveAttribute("target", "_blank");
    }
  });
});

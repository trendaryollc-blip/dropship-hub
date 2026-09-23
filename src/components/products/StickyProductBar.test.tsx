import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import StickyProductBar from "./StickyProductBar";

vi.mock("lucide-react", () => ({
  Star: (props: Record<string, unknown>) => <div data-testid="icon-star" {...props} />,
  ShoppingCart: (props: Record<string, unknown>) => <div data-testid="icon-cart" {...props} />,
  ExternalLink: (props: Record<string, unknown>) => <div data-testid="icon-external" {...props} />,
}));

vi.mock("next/image", () => ({
  default: (props: { src?: string; alt?: string; [k: string]: unknown }) => <img src={props.src} alt={props.alt} />,
}));

type IOEntry = { isIntersecting: boolean };
let emitIntersection: ((entry: IOEntry) => void) | null = null;

class FakeIntersectionObserver {
  constructor(callback: (entries: IOEntry[]) => void) {
    emitIntersection = (entry) => callback([entry]);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

const mockHeroRef = { current: document.createElement("div") };

const defaultProps = {
  title: "Wireless Earbuds Pro",
  price: 29.99,
  image: "https://example.com/img.jpg",
  rating: 4.5,
  reviews: 1234,
  source: "amazon",
  link: "https://amazon.com/product/123",
  heroRef: mockHeroRef as { current: HTMLElement | null },
};

function showBar() {
  act(() => {
    emitIntersection?.({ isIntersecting: false });
  });
}

beforeEach(() => {
  emitIntersection = null;
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StickyProductBar", () => {
  it("renders nothing until the hero scrolls out of view", () => {
    const { container } = render(<StickyProductBar {...defaultProps} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders product info once the hero is out of view", () => {
    render(<StickyProductBar {...defaultProps} />);
    showBar();
    expect(screen.getByText("Wireless Earbuds Pro")).toBeInTheDocument();
  });

  it("shows the formatted price", () => {
    render(<StickyProductBar {...defaultProps} />);
    showBar();
    expect(screen.getByText("$29.99")).toBeInTheDocument();
  });

  it("shows rating and review count", () => {
    render(<StickyProductBar {...defaultProps} />);
    showBar();
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("(1,234)")).toBeInTheDocument();
  });

  it("renders the CTA link to the source product in a new tab", () => {
    render(<StickyProductBar {...defaultProps} />);
    showBar();
    const link = screen.getByRole("link", { name: /View on Amazon/i });
    expect(link).toHaveAttribute("href", "https://amazon.com/product/123");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders the product image when provided", () => {
    const { container } = render(<StickyProductBar {...defaultProps} />);
    showBar();
    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.com/img.jpg");
  });

  it("skips price, rating, reviews, and image when they are null", () => {
    const { container } = render(
      <StickyProductBar
        {...defaultProps}
        price={null}
        rating={null}
        reviews={null}
        image={null}
      />
    );
    showBar();
    expect(screen.getByText("Wireless Earbuds Pro")).toBeInTheDocument();
    expect(screen.queryByText("$29.99")).not.toBeInTheDocument();
    expect(screen.queryByText("4.5")).not.toBeInTheDocument();
    expect(screen.queryByText("(1,234)")).not.toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
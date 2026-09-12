import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AICollections from "./AICollections";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("lucide-react", () => ({
  Sparkles: (props: any) => <div data-testid="icon-sparkles" {...props} />,
  TrendingUp: (props: any) => <div data-testid="icon-trending" {...props} />,
  DollarSign: (props: any) => <div data-testid="icon-dollar" {...props} />,
  Zap: (props: any) => <div data-testid="icon-zap" {...props} />,
  Target: (props: any) => <div data-testid="icon-target" {...props} />,
  ArrowRight: (props: any) => <div data-testid="icon-arrow" {...props} />,
  Flame: (props: any) => <div data-testid="icon-flame" {...props} />,
  Star: (props: any) => <div data-testid="icon-star" {...props} />,
}));

const COLLECTION_TITLES = [
  "Hot Under $50",
  "Low Competition",
  "High Margin 40%+",
  "Trending Electronics",
  "Top Rated 4.5+",
  "Viral Potential",
];

const COLLECTION_QUERIES = [
  "trending popular bestseller under 50",
  "niche unique low competition high margin",
  "high profit margin premium quality",
  "trending electronics gadget technology",
  "best rated top quality highly reviewed",
  "viral trending social media TikTok Instagram popular",
];

describe("AICollections", () => {
  it("renders all 6 collections", () => {
    render(<AICollections />);
    COLLECTION_TITLES.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  it("each collection has correct link href", () => {
    render(<AICollections />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);
    links.forEach((link, i) => {
      expect(link).toHaveAttribute("href", `/products?q=${encodeURIComponent(COLLECTION_QUERIES[i])}`);
    });
  });

  it("renders badges on applicable collections", () => {
    render(<AICollections />);
    expect(screen.getByText("Trending")).toBeInTheDocument();
    expect(screen.getByText("Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("Hot")).toBeInTheDocument();
    expect(screen.getByText("Viral")).toBeInTheDocument();
  });

  it("renders section heading", () => {
    render(<AICollections />);
    expect(screen.getByText("Quick Start")).toBeInTheDocument();
  });
});

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
  "Low Competition Winners",
  "High Margin Products",
  "Trending Electronics",
  "Top Rated Finds",
  "Viral Potential",
];

const COLLECTION_QUERIES = [
  "trending popular bestseller under 50",
  "niche unique low competition high margin",
  "high profit margin premium quality",
  "trending electronics gadget technology 2024",
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

  it("renders titles and subtitles", () => {
    render(<AICollections />);
    expect(screen.getByText("Trending products with high demand under $50")).toBeInTheDocument();
    expect(screen.getByText("Underserved niches with high profit potential")).toBeInTheDocument();
    expect(screen.getByText("Products with 40%+ profit margins")).toBeInTheDocument();
    expect(screen.getByText("Hot tech gadgets selling fast")).toBeInTheDocument();
    expect(screen.getByText("4.5+ star products across all platforms")).toBeInTheDocument();
    expect(screen.getByText("Products with social media buzz")).toBeInTheDocument();
  });

  it("renders section heading", () => {
    render(<AICollections />);
    expect(screen.getByText("AI Curated Collections")).toBeInTheDocument();
  });
});

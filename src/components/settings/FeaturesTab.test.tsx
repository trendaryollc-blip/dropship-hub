import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import FeaturesTab from "./FeaturesTab";
import { DollarSign, Search, TrendingUp, Sparkles } from "lucide-react";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const mockFeatures = [
  {
    name: "AI Price Optimization",
    description: "Optimize pricing with AI",
    icon: DollarSign,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    href: "/ai/pricing",
    hrefLabel: "Try it",
  },
  {
    name: "Product Search",
    description: "Search products with AI",
    icon: Search,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    href: "/products",
    hrefLabel: "Search",
  },
  {
    name: "Trend Analysis",
    description: "Analyze market trends",
    icon: TrendingUp,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    href: "/analytics",
    hrefLabel: "View",
  },
];

describe("FeaturesTab", () => {
  it("renders all AI feature cards", () => {
    render(<FeaturesTab aiFeatures={mockFeatures} />);
    expect(screen.getByText("AI Price Optimization")).toBeDefined();
    expect(screen.getByText("Product Search")).toBeDefined();
    expect(screen.getByText("Trend Analysis")).toBeDefined();
  });

  it("renders feature descriptions", () => {
    render(<FeaturesTab aiFeatures={mockFeatures} />);
    expect(screen.getByText("Optimize pricing with AI")).toBeDefined();
    expect(screen.getByText("Search products with AI")).toBeDefined();
    expect(screen.getByText("Analyze market trends")).toBeDefined();
  });

  it("each feature has link to correct page", () => {
    render(<FeaturesTab aiFeatures={mockFeatures} />);
    const pricingLink = screen.getByText("AI Price Optimization").closest("a");
    expect(pricingLink?.getAttribute("href")).toBe("/ai/pricing");

    const productLink = screen.getByText("Product Search").closest("a");
    expect(productLink?.getAttribute("href")).toBe("/products");

    const analyticsLink = screen.getByText("Trend Analysis").closest("a");
    expect(analyticsLink?.getAttribute("href")).toBe("/analytics");
  });

  it("shows AI assistant CTA", () => {
    render(<FeaturesTab aiFeatures={mockFeatures} />);
    expect(screen.getByText("Want AI-powered insights?")).toBeDefined();
    expect(screen.getByText("Chat with the AI Assistant for personalized recommendations.")).toBeDefined();
    const tryAiLink = screen.getByText("Try AI").closest("a");
    expect(tryAiLink?.getAttribute("href")).toBe("/ai");
  });

  it("renders the AI-Powered Features header", () => {
    render(<FeaturesTab aiFeatures={mockFeatures} />);
    expect(screen.getByText("AI-Powered Features")).toBeDefined();
  });

  it("renders empty features list", () => {
    render(<FeaturesTab aiFeatures={[]} />);
    expect(screen.getByText("AI-Powered Features")).toBeDefined();
    expect(screen.getByText("Want AI-powered insights?")).toBeDefined();
  });
});

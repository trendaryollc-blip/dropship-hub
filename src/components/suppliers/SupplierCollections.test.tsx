import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("lucide-react", () => ({
  Shield: (p: any) => <div data-testid="icon-shield" />,
  Zap: (p: any) => <div data-testid="icon-zap" />,
  DollarSign: (p: any) => <div data-testid="icon-dollar" />,
  TrendingUp: (p: any) => <div data-testid="icon-trending" />,
  Award: (p: any) => <div data-testid="icon-award" />,
  Truck: (p: any) => <div data-testid="icon-truck" />,
  ArrowRight: (p: any) => <div data-testid="icon-arrow-right" />,
}));

import SupplierCollections from "./SupplierCollections";

describe("SupplierCollections", () => {
  it("renders all 6 collection titles", () => {
    render(<SupplierCollections />);
    expect(screen.getByText("Top Performers")).toBeInTheDocument();
    expect(screen.getByText("Fast Shippers")).toBeInTheDocument();
    expect(screen.getByText("Budget Friendly")).toBeInTheDocument();
    expect(screen.getByText("New & Rising")).toBeInTheDocument();
    expect(screen.getByText("Verified Gold")).toBeInTheDocument();
    expect(screen.getByText("Free Shipping")).toBeInTheDocument();
  });

  it("renders all 6 collection subtitles", () => {
    render(<SupplierCollections />);
    expect(screen.getByText("Highest reliability + rating combination")).toBeInTheDocument();
    expect(screen.getByText("Express delivery in 4 days or less")).toBeInTheDocument();
    expect(screen.getByText("Best price competitiveness scores")).toBeInTheDocument();
    expect(screen.getByText("Recently established with improving trends")).toBeInTheDocument();
    expect(screen.getByText("Gold badge verified suppliers only")).toBeInTheDocument();
    expect(screen.getByText("Suppliers offering free shipping thresholds")).toBeInTheDocument();
  });

  it("each collection link has correct href", () => {
    render(<SupplierCollections />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/suppliers?sort=rating&badge=gold");
    expect(links[1]).toHaveAttribute("href", "/suppliers?shipping=express");
    expect(links[2]).toHaveAttribute("href", "/suppliers?sort=price");
    expect(links[3]).toHaveAttribute("href", "/suppliers?sort=newest");
    expect(links[4]).toHaveAttribute("href", "/suppliers?badge=gold");
    expect(links[5]).toHaveAttribute("href", "/suppliers?feature=free-shipping");
  });

  it("renders 6 collection links total", () => {
    render(<SupplierCollections />);
    expect(screen.getAllByRole("link")).toHaveLength(6);
  });

  it("renders the heading", () => {
    render(<SupplierCollections />);
    expect(screen.getByText("Smart Supplier Collections")).toBeInTheDocument();
  });
});

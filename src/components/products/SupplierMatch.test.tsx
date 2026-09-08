import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SupplierMatchSection from "./SupplierMatch";
import type { SupplierMatch } from "@/types/enrichment";

vi.mock("next/link", () => ({
  default: (props: any) => <a {...props}>{props.children}</a>,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

const mockSuppliers: SupplierMatch[] = [
  {
    id: "sup-1",
    name: "Shenzhen Electronics Co",
    location: "Shenzhen, China",
    flag: "🇨🇳",
    price: 8.50,
    shippingToUS: "7-12 days",
    responseTime: "< 24h",
    reliabilityScore: 92,
    trustBadge: "gold",
  },
  {
    id: "sup-2",
    name: "DG Trading",
    location: "Dongguan, China",
    flag: "🇨🇳",
    price: 9.20,
    shippingToUS: "10-15 days",
    responseTime: "< 48h",
    reliabilityScore: 78,
    trustBadge: "silver",
  },
];

describe("SupplierMatchSection", () => {
  it("renders heading", () => {
    render(<SupplierMatchSection suppliers={mockSuppliers} productTitle="Test" />);
    expect(screen.getByText("Best Supplier Matches")).toBeInTheDocument();
  });

  it("renders supplier names", () => {
    render(<SupplierMatchSection suppliers={mockSuppliers} productTitle="Test" />);
    expect(screen.getByText("Shenzhen Electronics Co")).toBeInTheDocument();
    expect(screen.getByText("DG Trading")).toBeInTheDocument();
  });

  it("displays supplier prices", () => {
    render(<SupplierMatchSection suppliers={mockSuppliers} productTitle="Test" />);
    expect(screen.getByText("$8.50")).toBeInTheDocument();
    expect(screen.getByText("$9.20")).toBeInTheDocument();
  });

  it("shows trust badges", () => {
    render(<SupplierMatchSection suppliers={mockSuppliers} productTitle="Test" />);
    expect(screen.getByText("gold")).toBeInTheDocument();
    expect(screen.getByText("silver")).toBeInTheDocument();
  });

  it("shows shipping times", () => {
    render(<SupplierMatchSection suppliers={mockSuppliers} productTitle="Test" />);
    expect(screen.getByText("7-12 days")).toBeInTheDocument();
  });

  it("shows response times", () => {
    render(<SupplierMatchSection suppliers={mockSuppliers} productTitle="Test" />);
    expect(screen.getByText("< 24h")).toBeInTheDocument();
  });

  it("shows rank numbers", () => {
    render(<SupplierMatchSection suppliers={mockSuppliers} productTitle="Test" />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows empty state when no suppliers", () => {
    render(<SupplierMatchSection suppliers={[]} productTitle="Test" />);
    expect(screen.getByText("No supplier matches found yet")).toBeInTheDocument();
  });

  it("links to suppliers page", () => {
    render(<SupplierMatchSection suppliers={mockSuppliers} productTitle="Test Product" />);
    expect(screen.getByText("View All")).toHaveAttribute("href", "/suppliers?product=Test%20Product&category=");
  });

  it("shows reliability scores", () => {
    render(<SupplierMatchSection suppliers={mockSuppliers} productTitle="Test" />);
    expect(screen.getByText("92")).toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
  });

  it("shows locations", () => {
    render(<SupplierMatchSection suppliers={mockSuppliers} productTitle="Test" />);
    expect(screen.getByText(/Shenzhen, China/)).toBeInTheDocument();
  });
});

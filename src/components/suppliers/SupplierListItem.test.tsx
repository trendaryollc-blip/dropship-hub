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
  Star: (p: any) => <div data-testid="icon-star" />,
  MapPin: (p: any) => <div data-testid="icon-map" />,
  Clock: (p: any) => <div data-testid="icon-clock" />,
  Truck: (p: any) => <div data-testid="icon-truck" />,
  Package: (p: any) => <div data-testid="icon-package" />,
  ArrowRight: (p: any) => <div data-testid="icon-arrow-right" />,
}));
vi.mock("./supplier-shared", () => ({
  badgeConfig: {
    gold: { label: "Gold", color: "text-amber-400", border: "border-amber-400/20" },
    silver: { label: "Silver", color: "text-slate-300", border: "border-slate-300/20" },
    bronze: { label: "Bronze", color: "text-orange-400", border: "border-orange-400/20" },
  },
  ScoreRing: ({ score, size }: any) => <div data-testid="score-ring">{score}</div>,
  dataSourceConfig: {
    live: { label: "LIVE DATA", color: "text-emerald-400", description: "" },
    estimated: { label: "ESTIMATED", color: "text-amber-400", description: "" },
  },
}));

import SupplierListItem from "./SupplierListItem";
import type { SupplierProfile } from "@/types/supplier";

const makeSupplier = (overrides: Partial<SupplierProfile> = {}): SupplierProfile => ({
  id: "sup-1",
  name: "Alpha Trading Co",
  slug: "alpha-trading",
  location: "Shenzhen",
  country: "CN",
  flag: "\ud83c\udde8\ud83c\uddf3",
  description: "Top supplier",
  specializations: ["Electronics"],
  trustBadge: "gold",
  dataSource: "live",
  stats: {
    reliabilityScore: 92, rating: 4.8, reviews: 150, responseTime: "2h",
    responseTimeHours: 2, shippingDays: 5, shippingDaysEU: 7, orderCompletionRate: 99,
    disputeRate: 0.3, monthlyOrders: 800, totalProducts: 300, yearEstablished: 2015,
    communicationScore: 90, qualityScore: 88, priceCompetitiveness: 85,
  },
  shipping: { methods: [], processingTime: "", freeShippingThreshold: null, packagingQuality: "standard" },
  quality: { inspection: "", returnPolicy: "", refundPolicy: "", replacementPolicy: "",
    disputeResolution: "", certifications: [] },
  catalog: { categories: [], priceRange: { min: 1, max: 100 }, moq: 10,
    samplesAvailable: true, samplePrice: 5 },
  communication: { methods: [], languages: [], supportHours: "" },
  source: "cj", sourceUrl: null, lastUpdated: new Date().toISOString(),
  ...overrides,
});

describe("SupplierListItem", () => {
  it("renders supplier name", () => {
    render(<SupplierListItem supplier={makeSupplier()} index={0} />);
    expect(screen.getByText("Alpha Trading Co")).toBeInTheDocument();
  });

  it("renders badge label", () => {
    render(<SupplierListItem supplier={makeSupplier()} index={0} />);
    expect(screen.getByText("Gold")).toBeInTheDocument();
  });

  it("renders silver badge", () => {
    render(<SupplierListItem supplier={makeSupplier({ trustBadge: "silver" })} index={0} />);
    expect(screen.getByText("Silver")).toBeInTheDocument();
  });

  it("renders bronze badge", () => {
    render(<SupplierListItem supplier={makeSupplier({ trustBadge: "bronze" })} index={0} />);
    expect(screen.getByText("Bronze")).toBeInTheDocument();
  });

  it("renders location", () => {
    render(<SupplierListItem supplier={makeSupplier()} index={0} />);
    expect(screen.getByText(/Shenzhen/)).toBeInTheDocument();
  });

  it("renders rating", () => {
    render(<SupplierListItem supplier={makeSupplier()} index={0} />);
    expect(screen.getByText("4.8")).toBeInTheDocument();
  });

  it("renders reliability score ring", () => {
    render(<SupplierListItem supplier={makeSupplier()} index={0} />);
    expect(screen.getByTestId("score-ring")).toBeInTheDocument();
    expect(screen.getByText("92")).toBeInTheDocument();
  });

  it("links to supplier page", () => {
    render(<SupplierListItem supplier={makeSupplier()} index={0} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/suppliers/sup-1");
  });

  it("renders data source label for live", () => {
    render(<SupplierListItem supplier={makeSupplier()} index={0} />);
    expect(screen.getByText("LIVE DATA")).toBeInTheDocument();
  });

  it("renders data source label for estimated", () => {
    render(<SupplierListItem supplier={makeSupplier({ dataSource: "estimated" })} index={0} />);
    expect(screen.getByText("ESTIMATED")).toBeInTheDocument();
  });

  it("renders shipping days", () => {
    render(<SupplierListItem supplier={makeSupplier()} index={0} />);
    expect(screen.getByText("5d")).toBeInTheDocument();
  });

  it("renders response time", () => {
    render(<SupplierListItem supplier={makeSupplier()} index={0} />);
    expect(screen.getByText("2h")).toBeInTheDocument();
  });

  it("renders monthly orders", () => {
    render(<SupplierListItem supplier={makeSupplier()} index={0} />);
    expect(screen.getByText("800/mo")).toBeInTheDocument();
  });

  it("renders zero rating as em dash", () => {
    render(<SupplierListItem supplier={makeSupplier({ stats: { ...makeSupplier().stats, rating: 0 } })} index={0} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders location with flag", () => {
    render(<SupplierListItem supplier={makeSupplier()} index={0} />);
    expect(screen.getByText(/Shenzhen/)).toBeInTheDocument();
  });

  it("renders with index animation delay", () => {
    render(<SupplierListItem supplier={makeSupplier()} index={3} />);
    expect(screen.getByText("Alpha Trading Co")).toBeInTheDocument();
  });

  it("renders initials for supplier name", () => {
    render(<SupplierListItem supplier={makeSupplier()} index={0} />);
    expect(screen.getByText("AT")).toBeInTheDocument();
  });
});

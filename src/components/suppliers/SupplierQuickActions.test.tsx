import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { SupplierProfile } from "@/types/supplier";

vi.mock("lucide-react", () => ({
  Sparkles: (p: any) => <div data-testid="icon-sparkles" />,
  Search: (p: any) => <div data-testid="icon-search" />,
  FileText: (p: any) => <div data-testid="icon-file" />,
  BarChart3: (p: any) => <div data-testid="icon-chart" />,
  MessageSquare: (p: any) => <div data-testid="icon-message" />,
  Package: (p: any) => <div data-testid="icon-package" />,
  TrendingUp: (p: any) => <div data-testid="icon-trending" />,
  Shield: (p: any) => <div data-testid="icon-shield" />,
}));

import SupplierQuickActions from "./SupplierQuickActions";

const mockSupplier: SupplierProfile = {
  id: "cj-dropshipping",
  name: "CJ Dropshipping",
  slug: "cj-dropshipping",
  location: "Yiwu",
  country: "CN",
  flag: "\ud83c\udde8\ud83c\uddf3",
  description: "Top supplier",
  specializations: ["Electronics", "Fashion"],
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
    disputeResolution: "", certifications: ["ISO9001"] },
  catalog: { categories: [], priceRange: { min: 1, max: 100 }, moq: 10,
    samplesAvailable: true, samplePrice: 5 },
  communication: { methods: [], languages: [], supportHours: "" },
  source: "cj", sourceUrl: null, lastUpdated: new Date().toISOString(),
};

describe("SupplierQuickActions", () => {
  it("returns null when no query and no suppliers", () => {
    const { container } = render(
      <SupplierQuickActions query="" supplierCount={0} suppliers={[]} onAction={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders all 6 action buttons", () => {
    render(
      <SupplierQuickActions query="test" supplierCount={5} suppliers={[mockSupplier]} onAction={vi.fn()} />
    );
    expect(screen.getByText("Analyze Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Find Their Products")).toBeInTheDocument();
    expect(screen.getByText("Start Negotiation")).toBeInTheDocument();
    expect(screen.getByText("Compare Pricing")).toBeInTheDocument();
    expect(screen.getByText("Request Samples")).toBeInTheDocument();
    expect(screen.getByText("Deep Performance Check")).toBeInTheDocument();
  });

  it("calls onAction with actionId, label, and prompt when Analyze Suppliers is clicked", () => {
    const onAction = vi.fn();
    render(<SupplierQuickActions query="test" supplierCount={5} suppliers={[mockSupplier]} onAction={onAction} />);
    fireEvent.click(screen.getByText("Analyze Suppliers"));
    expect(onAction).toHaveBeenCalledWith(
      "analyze",
      "Analyze Suppliers",
      expect.stringContaining("CJ Dropshipping")
    );
  });

  it("calls onAction with actionId, label, and prompt when Find Their Products is clicked", () => {
    const onAction = vi.fn();
    render(<SupplierQuickActions query="test" supplierCount={5} suppliers={[mockSupplier]} onAction={onAction} />);
    fireEvent.click(screen.getByText("Find Their Products"));
    expect(onAction).toHaveBeenCalledWith(
      "find-products",
      "Find Their Products",
      expect.stringContaining("CJ Dropshipping")
    );
  });

  it("calls onAction with actionId, label, and prompt when Start Negotiation is clicked", () => {
    const onAction = vi.fn();
    render(<SupplierQuickActions query="test" supplierCount={5} suppliers={[mockSupplier]} onAction={onAction} />);
    fireEvent.click(screen.getByText("Start Negotiation"));
    expect(onAction).toHaveBeenCalledWith(
      "negotiate",
      "Start Negotiation",
      expect.stringContaining("CJ Dropshipping")
    );
  });

  it("calls onAction with actionId, label, and prompt when Compare Pricing is clicked", () => {
    const onAction = vi.fn();
    render(<SupplierQuickActions query="test" supplierCount={5} suppliers={[mockSupplier]} onAction={onAction} />);
    fireEvent.click(screen.getByText("Compare Pricing"));
    expect(onAction).toHaveBeenCalledWith(
      "compare-pricing",
      "Compare Pricing",
      expect.stringContaining("CJ Dropshipping")
    );
  });

  it("calls onAction with actionId, label, and prompt when Request Samples is clicked", () => {
    const onAction = vi.fn();
    render(<SupplierQuickActions query="test" supplierCount={5} suppliers={[mockSupplier]} onAction={onAction} />);
    fireEvent.click(screen.getByText("Request Samples"));
    expect(onAction).toHaveBeenCalledWith(
      "request-samples",
      "Request Samples",
      expect.stringContaining("CJ Dropshipping")
    );
  });

  it("calls onAction with actionId, label, and prompt when Deep Performance Check is clicked", () => {
    const onAction = vi.fn();
    render(<SupplierQuickActions query="test" supplierCount={5} suppliers={[mockSupplier]} onAction={onAction} />);
    fireEvent.click(screen.getByText("Deep Performance Check"));
    expect(onAction).toHaveBeenCalledWith(
      "check-performance",
      "Deep Performance Check",
      expect.stringContaining("CJ Dropshipping")
    );
  });

  it("shows disabled buttons when disabled prop is true", () => {
    render(
      <SupplierQuickActions query="test" supplierCount={5} suppliers={[mockSupplier]} onAction={vi.fn()} disabled />
    );
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it("renders when supplierCount > 0 even with empty query", () => {
    render(
      <SupplierQuickActions query="" supplierCount={3} suppliers={[mockSupplier]} onAction={vi.fn()} />
    );
    expect(screen.getByText("Analyze Suppliers")).toBeInTheDocument();
  });

  it("renders Quick AI Actions label", () => {
    render(<SupplierQuickActions query="test" supplierCount={5} suppliers={[mockSupplier]} onAction={vi.fn()} />);
    expect(screen.getByText("Quick AI Actions")).toBeInTheDocument();
  });

  it("renders sparkles icons for each action", () => {
    render(<SupplierQuickActions query="test" supplierCount={5} suppliers={[mockSupplier]} onAction={vi.fn()} />);
    const sparkles = screen.getAllByTestId("icon-sparkles");
    expect(sparkles.length).toBeGreaterThanOrEqual(1);
  });

  it("each action button is clickable when not disabled", () => {
    const onAction = vi.fn();
    render(<SupplierQuickActions query="test" supplierCount={5} suppliers={[mockSupplier]} onAction={onAction} />);
    fireEvent.click(screen.getByText("Analyze Suppliers"));
    fireEvent.click(screen.getByText("Find Their Products"));
    fireEvent.click(screen.getByText("Start Negotiation"));
    fireEvent.click(screen.getByText("Compare Pricing"));
    fireEvent.click(screen.getByText("Request Samples"));
    fireEvent.click(screen.getByText("Deep Performance Check"));
    expect(onAction).toHaveBeenCalledTimes(6);
  });
});

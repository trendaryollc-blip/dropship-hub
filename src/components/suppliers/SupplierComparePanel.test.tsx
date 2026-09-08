import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("lucide-react", () => ({
  X: (p: any) => <div data-testid="icon-x" />,
  GitCompare: (p: any) => <div data-testid="icon-compare" />,
  Loader2: (p: any) => <div data-testid="icon-loader" />,
  Sparkles: (p: any) => <div data-testid="icon-sparkles" />,
  ChevronDown: (p: any) => <div data-testid="icon-chevron" />,
}));
vi.mock("./supplier-shared", () => ({
  badgeConfig: {
    gold: { label: "Gold", color: "text-amber-400", border: "border-amber-400/20" },
    silver: { label: "Silver", color: "text-slate-300", border: "border-slate-300/20" },
    bronze: { label: "Bronze", color: "text-orange-400", border: "border-orange-400/20" },
  },
  ScoreRing: ({ score, size }: any) => <div data-testid="score-ring">{score}</div>,
}));

import SupplierComparePanel from "./SupplierComparePanel";
import type { SupplierProfile } from "@/types/supplier";

const makeSupplier = (id: string, name: string): SupplierProfile => ({
  id, name, slug: id, location: "China", country: "CN", flag: "\ud83c\udde8\ud83c\uddf3",
  description: "", specializations: [], trustBadge: "gold", dataSource: "live",
  stats: { reliabilityScore: 95, rating: 4.8, reviews: 100, responseTime: "2h",
    responseTimeHours: 2, shippingDays: 5, shippingDaysEU: 7, orderCompletionRate: 99,
    disputeRate: 0.5, monthlyOrders: 500, totalProducts: 200, yearEstablished: 2015,
    communicationScore: 90, qualityScore: 88, priceCompetitiveness: 85 },
  shipping: { methods: [], processingTime: "", freeShippingThreshold: null, packagingQuality: "standard" },
  quality: { inspection: "", returnPolicy: "", refundPolicy: "", replacementPolicy: "",
    disputeResolution: "", certifications: [] },
  catalog: { categories: [], priceRange: { min: 0, max: 100 }, moq: 1,
    samplesAvailable: true, samplePrice: null },
  communication: { methods: [], languages: [], supportHours: "" },
  source: "cj", sourceUrl: null, lastUpdated: new Date().toISOString(),
});

describe("SupplierComparePanel", () => {
  it("returns null when no suppliers selected", () => {
    const { container } = render(
      <SupplierComparePanel selectedSuppliers={[]} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders selected supplier names", () => {
    const suppliers = [makeSupplier("s1", "Alpha Corp"), makeSupplier("s2", "Beta Ltd")];
    render(<SupplierComparePanel selectedSuppliers={suppliers} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.getByText("Alpha Corp")).toBeInTheDocument();
    expect(screen.getByText("Beta Ltd")).toBeInTheDocument();
  });

  it("shows supplier count in heading", () => {
    const suppliers = [makeSupplier("s1", "Alpha Corp")];
    render(<SupplierComparePanel selectedSuppliers={suppliers} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.getByText(/Compare Suppliers \(1\/4\)/)).toBeInTheDocument();
  });

  it("renders clear all button", () => {
    const suppliers = [makeSupplier("s1", "Alpha Corp")];
    render(<SupplierComparePanel selectedSuppliers={suppliers} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });

  it("shows AI Deep Compare when 2+ suppliers and onAICompare provided", () => {
    const suppliers = [makeSupplier("s1", "Alpha Corp"), makeSupplier("s2", "Beta Ltd")];
    render(
      <SupplierComparePanel
        selectedSuppliers={suppliers}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
        onAICompare={vi.fn()}
      />
    );
    expect(screen.getByText("AI Deep Compare")).toBeInTheDocument();
  });

  it("does not show AI Deep Compare with only 1 supplier", () => {
    const suppliers = [makeSupplier("s1", "Alpha Corp")];
    render(
      <SupplierComparePanel
        selectedSuppliers={suppliers}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
        onAICompare={vi.fn()}
      />
    );
    expect(screen.queryByText("AI Deep Compare")).not.toBeInTheDocument();
  });

  it("renders score rings for each supplier", () => {
    const suppliers = [makeSupplier("s1", "Alpha Corp"), makeSupplier("s2", "Beta Ltd")];
    render(<SupplierComparePanel selectedSuppliers={suppliers} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.getAllByTestId("score-ring")).toHaveLength(2);
  });

  it("calls onClearAll when Clear all is clicked", () => {
    const onClearAll = vi.fn();
    const suppliers = [makeSupplier("s1", "Alpha Corp")];
    render(<SupplierComparePanel selectedSuppliers={suppliers} onRemove={vi.fn()} onClearAll={onClearAll} />);
    fireEvent.click(screen.getByText("Clear all"));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("calls onRemove when X button is clicked on a supplier", () => {
    const onRemove = vi.fn();
    const suppliers = [makeSupplier("s1", "Alpha Corp")];
    render(<SupplierComparePanel selectedSuppliers={suppliers} onRemove={onRemove} onClearAll={vi.fn()} />);
    const removeButtons = screen.getAllByTestId("icon-x");
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith("s1");
  });

  it("shows Ready to compare when 2+ suppliers", () => {
    const suppliers = [makeSupplier("s1", "Alpha Corp"), makeSupplier("s2", "Beta Ltd")];
    render(<SupplierComparePanel selectedSuppliers={suppliers} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.getByText("Ready to compare")).toBeInTheDocument();
  });

  it("shows Select at least 2 to compare when only 1 supplier", () => {
    const suppliers = [makeSupplier("s1", "Alpha Corp")];
    render(<SupplierComparePanel selectedSuppliers={suppliers} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.getByText("Select at least 2 to compare")).toBeInTheDocument();
  });

  it("shows Add supplier placeholder when less than 4 selected", () => {
    const suppliers = [makeSupplier("s1", "Alpha Corp")];
    render(<SupplierComparePanel selectedSuppliers={suppliers} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.getByText("Add supplier")).toBeInTheDocument();
  });

  it("does not show Add supplier placeholder when 4 selected", () => {
    const suppliers = [
      makeSupplier("s1", "Alpha Corp"), makeSupplier("s2", "Beta Ltd"),
      makeSupplier("s3", "Gamma Inc"), makeSupplier("s4", "Delta Co"),
    ];
    render(<SupplierComparePanel selectedSuppliers={suppliers} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.queryByText("Add supplier")).not.toBeInTheDocument();
  });

  it("renders supplier initials", () => {
    const suppliers = [makeSupplier("s1", "Alpha Corp")];
    render(<SupplierComparePanel selectedSuppliers={suppliers} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.getByText("AC")).toBeInTheDocument();
  });

  it("renders shipping days and response time", () => {
    const suppliers = [makeSupplier("s1", "Alpha Corp")];
    render(<SupplierComparePanel selectedSuppliers={suppliers} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.getByText("5d ship")).toBeInTheDocument();
    expect(screen.getByText("2h resp")).toBeInTheDocument();
  });

  it("calls onAICompare when AI Deep Compare is clicked", () => {
    const onAICompare = vi.fn();
    const suppliers = [makeSupplier("s1", "Alpha Corp"), makeSupplier("s2", "Beta Ltd")];
    render(
      <SupplierComparePanel
        selectedSuppliers={suppliers}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
        onAICompare={onAICompare}
      />
    );
    fireEvent.click(screen.getByText("AI Deep Compare"));
    expect(onAICompare).toHaveBeenCalledWith(suppliers);
  });

  it("does not render AI compare section without onAICompare prop", () => {
    const suppliers = [makeSupplier("s1", "Alpha Corp"), makeSupplier("s2", "Beta Ltd")];
    render(
      <SupplierComparePanel
        selectedSuppliers={suppliers}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
      />
    );
    expect(screen.queryByText("AI Deep Compare")).not.toBeInTheDocument();
  });
});

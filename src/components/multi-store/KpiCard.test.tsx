import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DollarSign } from "lucide-react";
import KpiCard from "./KpiCard";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

vi.mock("@/hooks/useAnimatedCounter", () => ({
  useAnimatedCounter: (end: number) => end,
}));

describe("KpiCard", () => {
  it("renders label and value", () => {
    render(<KpiCard label="Revenue" value={1000} icon={<DollarSign />} delay={0} />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("1,000")).toBeInTheDocument();
  });

  it("renders positive trend indicator", () => {
    render(<KpiCard label="Revenue" value={1000} trend={12} icon={<DollarSign />} delay={0} />);
    expect(screen.getByText("12%")).toBeInTheDocument();
    expect(screen.getByText("12%").closest("span")).toHaveClass("text-emerald-400");
  });

  it("renders negative trend indicator", () => {
    render(<KpiCard label="Revenue" value={1000} trend={-5} icon={<DollarSign />} delay={0} />);
    expect(screen.getByText("5%")).toBeInTheDocument();
    expect(screen.getByText("5%").closest("span")).toHaveClass("text-red-400");
  });

  it("handles string value with $ prefix", () => {
    render(<KpiCard label="Revenue" value="$1,500" icon={<DollarSign />} delay={0} />);
    expect(screen.getByText("$1,500")).toBeInTheDocument();
  });

  it("handles string value with % suffix", () => {
    render(<KpiCard label="Conversion" value="3.5%" icon={<DollarSign />} delay={0} />);
    const container = screen.getByText("Conversion").closest("div")!.parentElement!;
    expect(container.textContent).toContain("%");
  });

  it("handles numeric value", () => {
    render(<KpiCard label="Orders" value={42} icon={<DollarSign />} delay={0} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});

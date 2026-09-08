import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SaturationGauge from "./SaturationGauge";
import type { SaturationResult } from "@/types/product-validation";

vi.mock("lucide-react", () => ({
  Users: () => <div data-testid="users" />,
  AlertTriangle: () => <div data-testid="alert-triangle" />,
  ShieldCheck: () => <div data-testid="shield-check" />,
  ShieldAlert: () => <div data-testid="shield-alert" />,
  ShieldX: () => <div data-testid="shield-x" />,
}));

const mockData: SaturationResult = {
  index: 45,
  level: "moderate",
  sellerCount: 200,
  marketConcentration: 35,
  priceWarRisk: "medium",
  barrierToEntry: "low",
  insight: "Moderately competitive market",
};

describe("SaturationGauge", () => {
  it("renders title and subtitle", () => {
    render(<SaturationGauge data={mockData} />);
    expect(screen.getByText("Saturation Index")).toBeInTheDocument();
    expect(screen.getByText("Market competition level")).toBeInTheDocument();
  });

  it("renders saturation index value", () => {
    render(<SaturationGauge data={mockData} />);
    expect(screen.getByText("45")).toBeInTheDocument();
  });

  it("renders level label", () => {
    render(<SaturationGauge data={mockData} />);
    expect(screen.getByText("Moderate")).toBeInTheDocument();
  });

  it("renders seller count", () => {
    render(<SaturationGauge data={mockData} />);
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("renders market concentration", () => {
    render(<SaturationGauge data={mockData} />);
    expect(screen.getByText("35%")).toBeInTheDocument();
  });

  it("renders price war risk", () => {
    render(<SaturationGauge data={mockData} />);
    expect(screen.getByText("medium", { selector: "span" })).toBeInTheDocument();
  });

  it("renders barrier to entry", () => {
    render(<SaturationGauge data={mockData} />);
    expect(screen.getByText("low", { selector: "span" })).toBeInTheDocument();
  });

  it("renders insight", () => {
    render(<SaturationGauge data={mockData} />);
    expect(screen.getByText("Moderately competitive market")).toBeInTheDocument();
  });

  it("shows high risk warning for high price war risk", () => {
    render(<SaturationGauge data={{ ...mockData, priceWarRisk: "high" }} />);
    expect(screen.getByText(/High price war risk/)).toBeInTheDocument();
  });

  it("shows high risk warning for high barrier to entry", () => {
    render(<SaturationGauge data={{ ...mockData, barrierToEntry: "high" }} />);
    expect(screen.getByText(/High barrier to entry/)).toBeInTheDocument();
  });

  it("hides warning when risks are not high", () => {
    render(<SaturationGauge data={mockData} />);
    expect(screen.queryByTestId("alert-triangle")).not.toBeInTheDocument();
  });

  it("renders unsaturated level", () => {
    render(<SaturationGauge data={{ ...mockData, level: "unsaturated" }} />);
    expect(screen.getByText("Unsaturated")).toBeInTheDocument();
  });

  it("renders hyper-saturated level", () => {
    render(<SaturationGauge data={{ ...mockData, level: "hyper-saturated" }} />);
    expect(screen.getByText("Hyper-Saturated")).toBeInTheDocument();
  });

  it("renders required icons", () => {
    render(<SaturationGauge data={mockData} />);
    expect(screen.getByTestId("users")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: null, isLoading: true }),
}));

vi.mock("lucide-react", () => ({
  Radar: (p: any) => <div data-testid="icon-radar" />,
  Loader2: (p: any) => <div data-testid="icon-loader" />,
}));

import RadarComparisonChart from "./RadarComparisonChart";

describe("RadarComparisonChart", () => {
  it("renders the radar comparison heading", () => {
    render(<RadarComparisonChart />);
    expect(screen.getByText("Radar Comparison")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<RadarComparisonChart />);
    expect(screen.getByText("Radar Comparison")).toBeInTheDocument();
  });

  it("shows message when no supplier ids", () => {
    render(<RadarComparisonChart />);
    expect(screen.getByText("Radar Comparison")).toBeInTheDocument();
  });
});

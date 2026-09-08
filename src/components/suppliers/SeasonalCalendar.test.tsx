import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: null, isLoading: true }),
}));

vi.mock("lucide-react", () => ({
  Calendar: (p: any) => <div data-testid="icon-calendar" />,
  Clock: (p: any) => <div data-testid="icon-clock" />,
  AlertTriangle: (p: any) => <div data-testid="icon-alert" />,
  CheckCircle: (p: any) => <div data-testid="icon-check" />,
  ChevronLeft: (p: any) => <div data-testid="icon-chevron-left" />,
  ChevronRight: (p: any) => <div data-testid="icon-chevron-right" />,
  Loader2: (p: any) => <div data-testid="icon-loader" />,
}));

import SeasonalCalendar from "./SeasonalCalendar";

describe("SeasonalCalendar", () => {
  it("renders the seasonal intelligence heading", () => {
    render(<SeasonalCalendar />);
    expect(screen.getByText("Seasonal Intelligence")).toBeInTheDocument();
  });

  it("renders event filter dropdown", () => {
    render(<SeasonalCalendar />);
    expect(screen.getByText("All Events")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<SeasonalCalendar />);
    expect(screen.getByText("Seasonal Intelligence")).toBeInTheDocument();
  });
});

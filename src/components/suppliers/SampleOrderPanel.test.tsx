import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: null, isLoading: true }),
  useMutation: () => ({ trigger: vi.fn(), isMutating: false }),
  revalidate: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  Package: (p: any) => <div data-testid="icon-package" />,
  Truck: (p: any) => <div data-testid="icon-truck" />,
  CheckCircle: (p: any) => <div data-testid="icon-check" />,
  Star: (p: any) => <div data-testid="icon-star" />,
  Clock: (p: any) => <div data-testid="icon-clock" />,
  Plus: (p: any) => <div data-testid="icon-plus" />,
  Loader2: (p: any) => <div data-testid="icon-loader" />,
}));

import SampleOrderPanel from "./SampleOrderPanel";

describe("SampleOrderPanel", () => {
  it("renders the sample orders heading", () => {
    render(<SampleOrderPanel />);
    expect(screen.getByText("Sample Orders")).toBeInTheDocument();
  });

  it("renders new order button", () => {
    render(<SampleOrderPanel />);
    expect(screen.getByText("New Order")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<SampleOrderPanel />);
    expect(screen.getByText("Sample Orders")).toBeInTheDocument();
  });
});

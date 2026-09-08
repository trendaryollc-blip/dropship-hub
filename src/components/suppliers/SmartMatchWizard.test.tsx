import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: null, isLoading: false }),
  useMutation: () => ({ trigger: vi.fn(), data: null, isMutating: false }),
}));

vi.mock("lucide-react", () => ({
  Wand2: (p: any) => <div data-testid="icon-wand" />,
  ChevronRight: (p: any) => <div data-testid="icon-chevron-right" />,
  ChevronLeft: (p: any) => <div data-testid="icon-chevron-left" />,
  Check: (p: any) => <div data-testid="icon-check" />,
  Loader2: (p: any) => <div data-testid="icon-loader" />,
  Sparkles: (p: any) => <div data-testid="icon-sparkles" />,
}));

import SmartMatchWizard from "./SmartMatchWizard";

describe("SmartMatchWizard", () => {
  it("renders the smart match heading", () => {
    render(<SmartMatchWizard />);
    expect(screen.getByText("Smart Supplier Match")).toBeInTheDocument();
  });

  it("shows niche selection step", () => {
    render(<SmartMatchWizard />);
    expect(screen.getByText("Select your store niche")).toBeInTheDocument();
  });

  it("shows next button", () => {
    render(<SmartMatchWizard />);
    expect(screen.getByText("Next")).toBeInTheDocument();
  });
});

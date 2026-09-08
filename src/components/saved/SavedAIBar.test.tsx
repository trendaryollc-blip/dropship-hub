import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SavedAIBar from "./SavedAIBar";

vi.mock("lucide-react", () => ({
  Brain: () => <div data-testid="icon" />,
  Search: () => <div data-testid="icon" />,
  DollarSign: () => <div data-testid="icon" />,
  FileText: () => <div data-testid="icon" />,
  Sparkles: () => <div data-testid="icon" />,
}));

describe("SavedAIBar", () => {
  const defaultProps = {
    onAction: vi.fn(),
    loading: null,
    productCount: 3,
  };

  it("returns null when productCount is 0", () => {
    const { container } = render(<SavedAIBar {...defaultProps} productCount={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders all 4 AI action buttons", () => {
    render(<SavedAIBar {...defaultProps} />);
    expect(screen.getByText("Analyze All")).toBeInTheDocument();
    expect(screen.getByText("Find Similar")).toBeInTheDocument();
    expect(screen.getByText("Optimize Pricing")).toBeInTheDocument();
    expect(screen.getByText("Generate Listings")).toBeInTheDocument();
  });

  it("calls onAction with correct id on button click", () => {
    const onAction = vi.fn();
    render(<SavedAIBar {...defaultProps} onAction={onAction} />);
    fireEvent.click(screen.getByText("Analyze All"));
    expect(onAction).toHaveBeenCalledWith("analyze-all");
  });

  it("shows loading spinner when loading matches an action", () => {
    render(<SavedAIBar {...defaultProps} loading="analyze-all" />);
    const buttons = screen.getAllByRole("button");
    const analyzeBtn = buttons.find((btn) => btn.textContent?.includes("Analyze All"));
    expect(analyzeBtn).toHaveClass("disabled:opacity-50");
  });

  it("disables all buttons when loading", () => {
    render(<SavedAIBar {...defaultProps} loading="find-similar" />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});

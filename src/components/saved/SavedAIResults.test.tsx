import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SavedAIResults, { type AIResult } from "./SavedAIResults";

vi.mock("lucide-react", () => ({
  X: () => <div data-testid="icon-x" />,
  CheckCircle2: () => <div data-testid="icon-check" />,
  XCircle: () => <div data-testid="icon-xcircle" />,
  Info: () => <div data-testid="icon-info" />,
  Loader2: () => <div data-testid="icon-loader" />,
}));

const mockResults: AIResult[] = [
  { tool: "Analyze", success: true, summary: "Product analyzed" },
  { tool: "Similar", success: false, summary: "Failed to find", error: "Timeout" },
];

describe("SavedAIResults", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: "AI Analysis",
    results: mockResults,
    loading: false,
  };

  it("returns null when not open", () => {
    const { container } = render(<SavedAIResults {...defaultProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders title when open", () => {
    render(<SavedAIResults {...defaultProps} />);
    expect(screen.getByText("AI Analysis")).toBeInTheDocument();
  });

  it("shows success and fail counts", () => {
    render(<SavedAIResults {...defaultProps} />);
    expect(screen.getByText("1 succeeded, 1 failed")).toBeInTheDocument();
  });

  it("calls onClose on close button click", () => {
    const onClose = vi.fn();
    render(<SavedAIResults {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByText("Close");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("handles Escape key press", () => {
    const onClose = vi.fn();
    render(<SavedAIResults {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

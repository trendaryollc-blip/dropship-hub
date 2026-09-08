import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToolExecutionPanel } from "./ToolExecutionPanel";

vi.mock("@/contexts/AIModeContext", () => ({
  useAIMode: vi.fn().mockReturnValue({
    recentExecutions: [
      { id: "exec-1", toolId: "update_price", status: "completed", input: { productId: "p1" }, result: { summary: "Price updated" }, startedAt: "2025-01-15T10:00:00Z", completedAt: "2025-01-15T10:00:01Z" },
    ],
    pendingConfirmations: [
      { id: "exec-2", toolId: "delete_product", status: "awaiting_confirmation", input: { productId: "p2" }, result: { summary: "Delete product" }, error: "confirmation_required", startedAt: "2025-01-15T10:00:00Z", completedAt: null },
    ],
    confirmAction: vi.fn(),
    cancelAction: vi.fn(),
    refreshRecent: vi.fn(),
    refreshPending: vi.fn(),
  }),
}));

describe("ToolExecutionPanel", () => {
  it("renders title", () => {
    render(<ToolExecutionPanel />);
    expect(screen.getByText("Tool Executions")).toBeInTheDocument();
  });

  it("shows recent executions", () => {
    render(<ToolExecutionPanel />);
    expect(screen.getByText("Update Price")).toBeInTheDocument();
  });

  it("switches to pending tab", () => {
    render(<ToolExecutionPanel />);
    fireEvent.click(screen.getByText(/Pending/));
    expect(screen.getByText("Delete Product")).toBeInTheDocument();
  });

  it("shows confirm/cancel for awaiting confirmation", () => {
    render(<ToolExecutionPanel />);
    fireEvent.click(screen.getByText(/Pending/));
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });
});

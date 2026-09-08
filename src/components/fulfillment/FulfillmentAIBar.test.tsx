import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FulfillmentAIBar from "./FulfillmentAIBar";

describe("FulfillmentAIBar", () => {
  let onAction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onAction = vi.fn();
  });

  it("renders 4 AI action buttons", () => {
    render(<FulfillmentAIBar onAction={onAction} loading={null} orderCount={5} />);
    expect(screen.getByText("Auto-Fulfill All")).toBeInTheDocument();
    expect(screen.getByText("Optimize Routing")).toBeInTheDocument();
    expect(screen.getByText("Bulk Tracking Sync")).toBeInTheDocument();
    expect(screen.getByText("Analyze Profitability")).toBeInTheDocument();
  });

  it("calls onAction when clicked", async () => {
    render(<FulfillmentAIBar onAction={onAction} loading={null} orderCount={5} />);
    await userEvent.click(screen.getByText("Auto-Fulfill All"));
    expect(onAction).toHaveBeenCalledWith("auto-fulfill-all");
    await userEvent.click(screen.getByText("Optimize Routing"));
    expect(onAction).toHaveBeenCalledWith("optimize-routing");
  });

  it("shows loading state", () => {
    render(<FulfillmentAIBar onAction={onAction} loading="auto-fulfill-all" orderCount={5} />);
    const autoFulfillBtn = screen.getByText("Auto-Fulfill All").closest("button")!;
    expect(autoFulfillBtn).toBeDisabled();
  });

  it("hides when orderCount is 0", () => {
    const { container } = render(<FulfillmentAIBar onAction={onAction} loading={null} orderCount={0} />);
    expect(container.innerHTML).toBe("");
  });
});

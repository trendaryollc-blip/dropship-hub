import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmationDialog, ConfirmationBanner } from "./ConfirmationDialog";

describe("ConfirmationDialog", () => {
  const mockRecord = {
    id: "exec-1",
    toolId: "update_price",
    status: "awaiting_confirmation" as const,
    input: { productId: "p1", newPrice: 29.99 },
    result: { summary: "Update product price" },
    error: "confirmation_required",
    startedAt: "2025-01-15T10:00:00Z",
    completedAt: null,
  };

  it("renders dialog with title", () => {
    render(
      <ConfirmationDialog
        record={mockRecord}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Action Requires Confirmation")).toBeInTheDocument();
  });

  it("renders formatted tool name", () => {
    render(
      <ConfirmationDialog
        record={mockRecord}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Update Price")).toBeInTheDocument();
  });

  it("renders input details", () => {
    render(
      <ConfirmationDialog
        record={mockRecord}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("p1")).toBeInTheDocument();
    expect(screen.getByText("29.99")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        record={mockRecord}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Confirm & Execute"));
    expect(onConfirm).toHaveBeenCalledWith("exec-1");
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmationDialog
        record={mockRecord}
        onConfirm={vi.fn()}
        onCancel={onCancel}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledWith("exec-1");
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ConfirmationDialog
        record={mockRecord}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onClose={onClose}
      />
    );
    const backdrop = container.querySelector(".bg-black\\/60");
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows dollar warning for financial fields", () => {
    const financialRecord = {
      ...mockRecord,
      input: { price: 50.00 },
    };
    render(
      <ConfirmationDialog
        record={financialRecord}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/\$50/)).toBeInTheDocument();
  });
});

describe("ConfirmationBanner", () => {
  const mockRecord = {
    id: "exec-2",
    toolId: "delete_product",
    status: "awaiting_confirmation" as const,
    input: { productId: "p1" },
    result: { summary: "Delete product from store" },
    error: "confirmation_required",
    startedAt: "2025-01-15T10:00:00Z",
    completedAt: null,
  };

  it("renders banner with tool name", () => {
    render(
      <ConfirmationBanner
        record={mockRecord}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Delete Product")).toBeInTheDocument();
  });

  it("renders summary", () => {
    render(
      <ConfirmationBanner
        record={mockRecord}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Delete product from store")).toBeInTheDocument();
  });

  it("calls onConfirm when Approve clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmationBanner
        record={mockRecord}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Approve"));
    expect(onConfirm).toHaveBeenCalledWith("exec-2");
  });

  it("calls onCancel when Deny clicked", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmationBanner
        record={mockRecord}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText("Deny"));
    expect(onCancel).toHaveBeenCalledWith("exec-2");
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MultiStoreAIBar from "./MultiStoreAIBar";

describe("MultiStoreAIBar", () => {
  it("renders 4 AI action buttons", () => {
    render(
      <MultiStoreAIBar onAction={vi.fn()} loading={null} storeCount={3} totalOrders={100} totalRevenue={5000} />
    );
    expect(screen.getByText("Optimize Cross-Store")).toBeInTheDocument();
    expect(screen.getByText("Sync All Inventory")).toBeInTheDocument();
    expect(screen.getByText("Bulk Fulfill Orders")).toBeInTheDocument();
    expect(screen.getByText("Compare Performance")).toBeInTheDocument();
  });

  it("calls onAction when clicked", () => {
    const onAction = vi.fn();
    render(
      <MultiStoreAIBar onAction={onAction} loading={null} storeCount={2} totalOrders={50} totalRevenue={2000} />
    );

    fireEvent.click(screen.getByText("Optimize Cross-Store"));
    expect(onAction).toHaveBeenCalledWith("optimize-cross-store");

    fireEvent.click(screen.getByText("Sync All Inventory"));
    expect(onAction).toHaveBeenCalledWith("sync-all-inventory");

    fireEvent.click(screen.getByText("Bulk Fulfill Orders"));
    expect(onAction).toHaveBeenCalledWith("bulk-fulfill");

    fireEvent.click(screen.getByText("Compare Performance"));
    expect(onAction).toHaveBeenCalledWith("compare-performance");
  });

  it("shows loading state", () => {
    render(
      <MultiStoreAIBar onAction={vi.fn()} loading="sync-all-inventory" storeCount={2} totalOrders={50} totalRevenue={2000} />
    );

    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("hides when storeCount is 0", () => {
    const { container } = render(
      <MultiStoreAIBar onAction={vi.fn()} loading={null} storeCount={0} totalOrders={0} totalRevenue={0} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("displays store count and revenue info", () => {
    render(
      <MultiStoreAIBar onAction={vi.fn()} loading={null} storeCount={3} totalOrders={100} totalRevenue={5000} />
    );
    expect(screen.getByText(/3 stores/)).toBeInTheDocument();
    expect(screen.getByText(/\$5,000 revenue/)).toBeInTheDocument();
  });
});

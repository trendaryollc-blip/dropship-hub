import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StoreAIBar from "./StoreAIBar";

describe("StoreAIBar", () => {
  it("renders all 4 action buttons", () => {
    render(<StoreAIBar onAction={vi.fn()} loading={null} storeCount={2} />);
    expect(screen.getByText("Sync Inventory")).toBeInTheDocument();
    expect(screen.getByText("Store Performance")).toBeInTheDocument();
    expect(screen.getByText("Bulk Push")).toBeInTheDocument();
    expect(screen.getByText("Optimize Listings")).toBeInTheDocument();
  });

  it("calls onAction when button clicked", () => {
    const onAction = vi.fn();
    render(<StoreAIBar onAction={onAction} loading={null} storeCount={1} />);
    fireEvent.click(screen.getByText("Sync Inventory"));
    expect(onAction).toHaveBeenCalledWith("sync-inventory");
  });

  it("calls onAction with correct id for each button", () => {
    const onAction = vi.fn();
    render(<StoreAIBar onAction={onAction} loading={null} storeCount={1} />);
    fireEvent.click(screen.getByText("Store Performance"));
    expect(onAction).toHaveBeenCalledWith("store-performance");
    fireEvent.click(screen.getByText("Bulk Push"));
    expect(onAction).toHaveBeenCalledWith("bulk-push");
    fireEvent.click(screen.getByText("Optimize Listings"));
    expect(onAction).toHaveBeenCalledWith("optimize-listings");
  });

  it("shows loading state for specific action", () => {
    render(<StoreAIBar onAction={vi.fn()} loading="sync-inventory" storeCount={1} />);
    const syncBtn = screen.getByText("Sync Inventory").closest("button")!;
    expect(syncBtn).toBeDisabled();
    expect(syncBtn.querySelector(".animate-spin")).toBeTruthy();
  });

  it("disables all buttons when loading", () => {
    render(<StoreAIBar onAction={vi.fn()} loading="bulk-push" storeCount={1} />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("hides when storeCount is 0", () => {
    const { container } = render(<StoreAIBar onAction={vi.fn()} loading={null} storeCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("displays store count text", () => {
    render(<StoreAIBar onAction={vi.fn()} loading={null} storeCount={3} />);
    expect(screen.getByText(/3 stores? connected/)).toBeInTheDocument();
  });

  it("displays singular store text for count 1", () => {
    render(<StoreAIBar onAction={vi.fn()} loading={null} storeCount={1} />);
    expect(screen.getByText(/1 store connected/)).toBeInTheDocument();
  });
});

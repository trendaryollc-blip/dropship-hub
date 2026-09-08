import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SavedBulkBar from "./SavedBulkBar";

vi.mock("lucide-react", () => ({
  Store: () => <div data-testid="icon" />,
  DollarSign: () => <div data-testid="icon" />,
  FileText: () => <div data-testid="icon" />,
  GitCompare: () => <div data-testid="icon" />,
  Trash2: () => <div data-testid="icon" />,
  X: () => <div data-testid="icon" />,
}));

const mockUseSavedProducts = vi.fn();
vi.mock("./SavedProductsProvider", () => ({
  useSavedProducts: () => mockUseSavedProducts(),
}));

describe("SavedBulkBar", () => {
  const defaultProps = {
    onBulkAction: vi.fn(),
    loading: null,
  };

  it("returns null when no selections", () => {
    mockUseSavedProducts.mockReturnValue({
      selectedIds: new Set(),
      clearSelection: vi.fn(),
      setSelectMode: vi.fn(),
      removeSelected: vi.fn(),
    });
    const { container } = render(<SavedBulkBar {...defaultProps} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders bulk action buttons when selections exist", () => {
    mockUseSavedProducts.mockReturnValue({
      selectedIds: new Set(["1", "2"]),
      clearSelection: vi.fn(),
      setSelectMode: vi.fn(),
      removeSelected: vi.fn(),
    });
    render(<SavedBulkBar {...defaultProps} />);
    expect(screen.getByText("Push to Store")).toBeInTheDocument();
    expect(screen.getByText("Calculate Margins")).toBeInTheDocument();
    expect(screen.getByText("Generate Listings")).toBeInTheDocument();
    expect(screen.getByText("Compare Suppliers")).toBeInTheDocument();
  });

  it("shows selected count", () => {
    mockUseSavedProducts.mockReturnValue({
      selectedIds: new Set(["1", "2", "3"]),
      clearSelection: vi.fn(),
      setSelectMode: vi.fn(),
      removeSelected: vi.fn(),
    });
    render(<SavedBulkBar {...defaultProps} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("selected")).toBeInTheDocument();
  });

  it("calls onBulkAction on button click", () => {
    const onBulkAction = vi.fn();
    mockUseSavedProducts.mockReturnValue({
      selectedIds: new Set(["1"]),
      clearSelection: vi.fn(),
      setSelectMode: vi.fn(),
      removeSelected: vi.fn(),
    });
    render(<SavedBulkBar {...defaultProps} onBulkAction={onBulkAction} />);
    fireEvent.click(screen.getByText("Push to Store"));
    expect(onBulkAction).toHaveBeenCalledWith("push-to-store");
  });

  it("calls clearSelection and setSelectMode when X clicked", () => {
    const clearSelection = vi.fn();
    const setSelectMode = vi.fn();
    mockUseSavedProducts.mockReturnValue({
      selectedIds: new Set(["1"]),
      clearSelection,
      setSelectMode,
      removeSelected: vi.fn(),
    });
    render(<SavedBulkBar {...defaultProps} />);
    const xButtons = screen.getAllByRole("button");
    const clearBtn = xButtons.find((btn) => btn.className.includes("rounded-md"));
    fireEvent.click(clearBtn!);
    expect(clearSelection).toHaveBeenCalled();
    expect(setSelectMode).toHaveBeenCalledWith(false);
  });
});

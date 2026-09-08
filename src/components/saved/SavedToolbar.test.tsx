import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SavedToolbar from "./SavedToolbar";

vi.mock("lucide-react", () => ({
  Search: () => <div data-testid="icon-search" />,
  X: () => <div data-testid="icon-x" />,
  SlidersHorizontal: () => <div data-testid="icon-sliders" />,
  CheckSquare: () => <div data-testid="icon-checksquare" />,
  Square: () => <div data-testid="icon-square" />,
  LayoutGrid: () => <div data-testid="icon-grid" />,
  List: () => <div data-testid="icon-list" />,
}));

vi.mock("@/components/ui/ViewToggle", () => ({
  default: ({ viewMode, setViewMode }: any) => (
    <div data-testid="view-toggle">
      <button onClick={() => setViewMode("grid")}>Grid</button>
      <button onClick={() => setViewMode("list")}>List</button>
    </div>
  ),
}));

const mockUseSavedProducts = vi.fn();
vi.mock("./SavedProductsProvider", () => ({
  useSavedProducts: () => mockUseSavedProducts(),
}));

describe("SavedToolbar", () => {
  const defaultProps = {
    search: "",
    setSearch: vi.fn(),
    sort: "savedAt-desc" as const,
    setSort: vi.fn(),
    platformFilter: [],
    setPlatformFilter: vi.fn(),
    viewMode: "grid" as const,
    setViewMode: vi.fn(),
  };

  beforeEach(() => {
    mockUseSavedProducts.mockReturnValue({
      savedProducts: [],
      isSelectMode: false,
      setSelectMode: vi.fn(),
      selectAll: vi.fn(),
      clearSelection: vi.fn(),
      selectedIds: new Set(),
    });
  });

  it("renders search input", () => {
    render(<SavedToolbar {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search saved products...")).toBeInTheDocument();
  });

  it("renders sort dropdown", () => {
    render(<SavedToolbar {...defaultProps} />);
    expect(screen.getByDisplayValue("Newest first")).toBeInTheDocument();
  });

  it("renders view toggle", () => {
    render(<SavedToolbar {...defaultProps} />);
    expect(screen.getByTestId("view-toggle")).toBeInTheDocument();
  });

  it("renders select button", () => {
    render(<SavedToolbar {...defaultProps} />);
    expect(screen.getByText("Select")).toBeInTheDocument();
  });

  it("calls setSearch when search input changes", () => {
    const setSearch = vi.fn();
    render(<SavedToolbar {...defaultProps} setSearch={setSearch} />);
    fireEvent.change(screen.getByPlaceholderText("Search saved products..."), {
      target: { value: "test" },
    });
    expect(setSearch).toHaveBeenCalledWith("test");
  });
});

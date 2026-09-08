import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductActionBar from "./ProductActionBar";

vi.mock("@/components/saved/SavedProductsProvider", () => ({
  useSavedProducts: () => ({
    isSaved: () => false,
    toggleSave: vi.fn(),
  }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockResolvedValue({}),
}));

describe("ProductActionBar", () => {
  const defaultProps = {
    platform: "Amazon",
    platformUrl: "https://amazon.com/dp/B0TEST",
    productTitle: "Test Product",
    category: "Electronics",
    id: "prod-1",
    price: 29.99,
    image: "https://example.com/product.jpg",
  };

  it("renders action buttons", () => {
    render(<ProductActionBar {...defaultProps} />);
    expect(screen.getAllByText("Save").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Compare").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Suppliers").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Save text", () => {
    render(<ProductActionBar {...defaultProps} />);
    expect(screen.getAllByText("Save").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Order Sample button", () => {
    render(<ProductActionBar {...defaultProps} />);
    expect(screen.getByText("Order Sample")).toBeInTheDocument();
  });

  it("renders Start Selling button", () => {
    render(<ProductActionBar {...defaultProps} />);
    expect(screen.getByText("Start Selling")).toBeInTheDocument();
  });

  it("renders Monitor button", () => {
    render(<ProductActionBar {...defaultProps} />);
    expect(screen.getAllByText("Monitor").length).toBeGreaterThanOrEqual(1);
  });

  it("renders platform link", () => {
    render(<ProductActionBar {...defaultProps} />);
    const links = screen.getAllByText("Amazon");
    const platformLink = links[0].closest("a");
    expect(platformLink).toHaveAttribute("href", "https://amazon.com/dp/B0TEST");
    expect(platformLink).toHaveAttribute("target", "_blank");
  });

  it("renders Analyze link", () => {
    render(<ProductActionBar {...defaultProps} />);
    expect(screen.getByText("Analyze")).toBeInTheDocument();
  });

  it("opens Order Sample modal when clicked", () => {
    render(<ProductActionBar {...defaultProps} />);
    const orderBtns = screen.getAllByText("Order Sample");
    fireEvent.click(orderBtns[0]);
    expect(screen.getByPlaceholderText("Full Name")).toBeInTheDocument();
  });

  it("opens Start Selling modal when clicked", () => {
    render(<ProductActionBar {...defaultProps} />);
    const sellBtns = screen.getAllByText("Start Selling");
    fireEvent.click(sellBtns[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("suppliers link has correct href", () => {
    render(<ProductActionBar {...defaultProps} />);
    const suppliersLink = screen.getByText("Suppliers").closest("a");
    expect(suppliersLink).toHaveAttribute("href", "/suppliers?product=Test%20Product&category=Electronics&source=Amazon&price=29.99");
  });
});

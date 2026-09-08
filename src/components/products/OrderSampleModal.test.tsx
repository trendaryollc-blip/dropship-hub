import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OrderSampleModal from "./OrderSampleModal";

vi.mock("lucide-react", () => ({
  ShoppingCart: (props: any) => <div data-testid="icon-cart" {...props} />,
  Loader2: (props: any) => <div data-testid="icon-loader" {...props} />,
  Check: (props: any) => <div data-testid="icon-check" {...props} />,
}));

const defaultProps = {
  productTitle: "Test Product",
  productPrice: 29.99,
  ordering: false,
  success: false,
  onClose: vi.fn(),
  onOrder: vi.fn(),
};

describe("OrderSampleModal", () => {
  it("renders form fields", () => {
    render(<OrderSampleModal {...defaultProps} />);
    expect(screen.getByPlaceholderText("Full Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Street Address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("City")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("State")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ZIP Code")).toBeInTheDocument();
  });

  it("renders product info", () => {
    render(<OrderSampleModal {...defaultProps} />);
    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("$29.99 × 1")).toBeInTheDocument();
  });

  it("submits form with address data", () => {
    const onOrder = vi.fn();
    render(<OrderSampleModal {...defaultProps} onOrder={onOrder} />);
    fireEvent.change(screen.getByPlaceholderText("Full Name"), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByPlaceholderText("Street Address"), { target: { value: "123 Main St" } });
    fireEvent.change(screen.getByPlaceholderText("City"), { target: { value: "New York" } });
    fireEvent.change(screen.getByPlaceholderText("State"), { target: { value: "NY" } });
    fireEvent.change(screen.getByPlaceholderText("ZIP Code"), { target: { value: "10001" } });
    fireEvent.click(screen.getByRole("button", { name: /order sample/i }));
    expect(onOrder).toHaveBeenCalledWith({
      fullName: "John Doe",
      phone: "",
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "US",
    });
  });

  it("shows success state", () => {
    render(<OrderSampleModal {...defaultProps} success={true} />);
    expect(screen.getByText("Order Placed!")).toBeInTheDocument();
    expect(screen.getByText("Your sample order has been placed via CJ Dropshipping.")).toBeInTheDocument();
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    render(<OrderSampleModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows ordering state", () => {
    render(<OrderSampleModal {...defaultProps} ordering={true} />);
    expect(screen.getByText("Placing Order...")).toBeInTheDocument();
  });
});

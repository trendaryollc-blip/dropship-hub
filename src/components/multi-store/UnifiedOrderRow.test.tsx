import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UnifiedOrderRow from "./UnifiedOrderRow";
import type { UnifiedOrder } from "@/types/multi-store";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

const baseOrder: UnifiedOrder = {
  id: "o1",
  orderId: "ord-1",
  storeId: "s1",
  storeName: "My Shopify Store",
  storePlatform: "shopify",
  orderNumber: "SH-1001",
  customerName: "John Doe",
  customerEmail: "john@example.com",
  items: [
    { productId: "p1", title: "Wireless Earbuds", quantity: 2, unitPrice: 29.99, totalPrice: 59.98 },
  ],
  totalAmount: 59.98,
  currency: "USD",
  status: "pending",
  fulfillmentStatus: "unfulfilled",
  shippingAddress: {
    fullName: "John Doe",
    street: "123 Main St",
    city: "Austin",
    state: "TX",
    zipCode: "73301",
    country: "US",
  },
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:30:00Z",
};

describe("UnifiedOrderRow", () => {
  it("renders order number, status, and amount", () => {
    render(<UnifiedOrderRow order={baseOrder} delay={0} />);
    expect(screen.getByText("SH-1001")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("$59.98")).toBeInTheDocument();
  });

  it("expands on click to show details", () => {
    render(<UnifiedOrderRow order={baseOrder} delay={0} />);
    expect(screen.queryByText("Platform:")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("SH-1001").closest("div")!.parentElement!);

    expect(screen.getByText("Platform:")).toBeInTheDocument();
    expect(screen.getByText("shopify")).toBeInTheDocument();
    expect(screen.getByText("Items:")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows platform icon and customer name", () => {
    render(<UnifiedOrderRow order={baseOrder} delay={0} />);
    const container = screen.getByText("SH-1001").closest("div")!.parentElement!;
    expect(container.textContent).toContain("My Shopify Store");
    expect(container.textContent).toContain("John Doe");
  });

  it("displays tracking number when present", () => {
    const orderWithTracking = { ...baseOrder, trackingNumber: "TRK-99887" };
    render(<UnifiedOrderRow order={orderWithTracking} delay={0} />);

    fireEvent.click(screen.getByText("SH-1001").closest("div")!.parentElement!);

    expect(screen.getByText("TRK-99887")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrderCard from "./OrderCard";
import type { FulfillmentOrder } from "@/types/fulfillment";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

const baseOrder: FulfillmentOrder = {
  id: "ord-1",
  trendaryoOrderId: "tord-1",
  orderNumber: "ORD-1001",
  customerName: "John Doe",
  customerEmail: "john@example.com",
  shippingAddress: {
    fullName: "John Doe",
    email: "john@example.com",
    phone: "555-1234",
    street: "123 Main St",
    city: "Springfield",
    state: "IL",
    zipCode: "62704",
    country: "US",
  },
  items: [
    {
      productId: "p1",
      name: "Widget Pro",
      price: 29.99,
      quantity: 2,
      source: "cj",
      supplierId: "cj",
      supplierName: "CJ Dropshipping",
      imageUrl: "https://example.com/img.jpg",
      platformProductId: "cp1",
      unitCost: 8.5,
    },
  ],
  status: "pending",
  platformOrders: [],
  totalRevenue: 59.98,
  totalCost: 17.0,
  profit: 42.98,
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z",
};

function renderOrder(overrides: Partial<FulfillmentOrder> = {}, onAction = vi.fn()) {
  return render(<OrderCard order={{ ...baseOrder, ...overrides }} onAction={onAction} />);
}

describe("OrderCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders order number, status, and profit", () => {
    renderOrder();
    expect(screen.getByText("ORD-1001")).toBeInTheDocument();
    expect(screen.getByText(/pending/)).toBeInTheDocument();
    expect(screen.getAllByText("$42.98").length).toBeGreaterThanOrEqual(1);
  });

  it("shows items with images and prices", () => {
    renderOrder();
    expect(screen.getByText("Widget Pro")).toBeInTheDocument();
    expect(screen.getByText("$29.99 x 2 · Cost: $8.50")).toBeInTheDocument();
    expect(document.querySelector('img[src="https://example.com/img.jpg"]')).toBeInTheDocument();
  });

  it("shows financial summary (revenue, cost, profit)", () => {
    renderOrder();
    expect(screen.getByText("Revenue").nextElementSibling).toHaveTextContent("$59.98");
    expect(screen.getByText("Cost").nextElementSibling).toHaveTextContent("$17.00");
  });

  it("copy address button works", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ writeText } as ClipboardAPI);
    renderOrder();
    const copyBtn = screen.getByTitle("Copy address");
    await userEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("John Doe")
    );
  });

  it("shows approve/auto-order buttons for pending orders", () => {
    renderOrder({ status: "pending" });
    expect(screen.getByText(/Auto-Order via CJ/)).toBeInTheDocument();
  });

  it("shows tracking input for in_progress orders", () => {
    renderOrder({ status: "in_progress" });
    expect(screen.getByPlaceholderText("Tracking number")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Carrier")).toBeInTheDocument();
  });

  it("shows mark delivered button for shipped orders", () => {
    renderOrder({ status: "shipped" });
    expect(screen.getByText(/Mark Delivered/)).toBeInTheDocument();
  });

  it("cancel button shown for non-delivered orders", () => {
    renderOrder({ status: "pending" });
    expect(screen.getByText(/Cancel/)).toBeInTheDocument();
  });

  it("cancel button not shown for delivered orders", () => {
    renderOrder({ status: "delivered" });
    expect(screen.queryByText(/Cancel/)).not.toBeInTheDocument();
  });
});

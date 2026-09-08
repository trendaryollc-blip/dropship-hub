import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FulfillmentChatSidebar from "./FulfillmentChatSidebar";

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(() => Promise.resolve({})),
}));

const defaultProps = {
  orderCounts: { pending: 3, in_progress: 2, shipped: 1, completed: 10 },
  totalOrders: 16,
};

describe("FulfillmentChatSidebar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, "fetch").mockResolvedValue({
      ok: false,
      body: null,
    } as Response);
  });

  it("renders chat toggle button", () => {
    render(<FulfillmentChatSidebar {...defaultProps} />);
    expect(screen.getByTitle("AI Fulfillment Assistant")).toBeInTheDocument();
  });

  it("opens sidebar when clicked", async () => {
    render(<FulfillmentChatSidebar {...defaultProps} />);
    await userEvent.click(screen.getByTitle("AI Fulfillment Assistant"));
    expect(screen.getByText("Fulfillment AI")).toBeInTheDocument();
    expect(screen.getByText("16 orders tracked")).toBeInTheDocument();
  });

  it("displays order context", async () => {
    render(<FulfillmentChatSidebar {...defaultProps} />);
    await userEvent.click(screen.getByTitle("AI Fulfillment Assistant"));
    expect(screen.getByText(/Ask anything about fulfillment/)).toBeInTheDocument();
  });

  it("has message input", async () => {
    render(<FulfillmentChatSidebar {...defaultProps} />);
    await userEvent.click(screen.getByTitle("AI Fulfillment Assistant"));
    expect(screen.getByPlaceholderText("Ask about fulfillment...")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();

const now = new Date().toISOString();

function makeCascade(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: "rc1", orderId: "ORD-1", orderNumber: "#1001", customerName: "John Doe",
    customerEmail: "john@example.com", productTitle: "Earbuds", orderAmount: 29.99,
    refundAmount: 29.99, reason: "defective", reasonDetails: "", status: "initiated",
    totalRefundCost: 29.99, supplierRefundReceived: 0, netLoss: 29.99,
    steps: [
      { id: "step-1", name: "Customer Refund Request", status: "completed" },
      { id: "step-2", name: "File Supplier Claim", status: "pending" },
      { id: "step-3", name: "Supplier Responds", status: "pending" },
      { id: "step-4", name: "Process Store Refund", status: "pending" },
      { id: "step-5", name: "Process Payment Refund", status: "pending" },
      { id: "step-6", name: "Reconcile & Close", status: "pending" },
    ],
    timeline: [{ id: "evt-1", action: "Refund initiated", actor: "admin", details: "Created", timestamp: now }],
    createdAt: now, updatedAt: now,
    ...overrides,
  };
}

const defaultCascade = makeCascade();

function defaultUseAPIMock(url: string) {
  if (url.includes("type=stats")) {
    return {
      data: {
        stats: {
          totalRefunds: 4, totalRefundAmount: 119.96, supplierRecovery: 60, netLoss: 59.96,
          avgProcessingDays: 3.5, refundRate: 80,
          topReasons: [{ reason: "defective", count: 2 }],
          monthlyTrend: [],
        },
      },
      mutate: mockMutate, isLoading: false, error: undefined,
    };
  }
  return { data: { cascades: [defaultCascade] }, mutate: mockMutate, isLoading: false, error: undefined };
}

const mockUseAPI = vi.fn(defaultUseAPIMock);
vi.mock("@/hooks/useAPI", () => ({ useAPI: (url: string) => mockUseAPI(url) }));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock("@/components/ui/Toast", () => ({ useToast: () => mockToast }));

const mockAuthJson = vi.fn();
vi.mock("@/lib/auth-headers", () => ({ authJson: (...args: unknown[]) => mockAuthJson(...args) }));

import RefundCascadePage from "./RefundCascadePage";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAPI.mockReset().mockImplementation(defaultUseAPIMock);
});

describe("RefundCascadePage", () => {
  it("renders header, stats and saved cascades", () => {
    render(<RefundCascadePage />);
    expect(screen.getByText("Refund Cascade")).toBeTruthy();
    expect(screen.getByText("Total Refunds")).toBeTruthy();
    expect(screen.getByText("Saved Refund Cascades (1)")).toBeTruthy();
    expect(screen.getByText(/#1001 — Earbuds/)).toBeTruthy();
  });

  it("shows list loading and error states", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: undefined, mutate: mockMutate, isLoading: false,
      error: !url.includes("type=stats") ? new Error("boom") : undefined,
    }));
    render(<RefundCascadePage />);
    expect(screen.getByText(/Couldn't load your refund cascades/)).toBeTruthy();
    fireEvent.click(screen.getByText("Retry"));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("shows empty state when no cascades", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: url.includes("type=stats") ? undefined : { cascades: [] },
      mutate: mockMutate, isLoading: false, error: undefined,
    }));
    render(<RefundCascadePage />);
    expect(screen.getByText("No refund cascades yet")).toBeTruthy();
  });

  it("shows inline validation error and skips API on invalid create", async () => {
    render(<RefundCascadePage />);
    fireEvent.click(screen.getByRole("button", { name: "New Refund" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Refund Cascade" }));
    expect(screen.getByText(/Fill all required fields/)).toBeTruthy();
    expect(mockAuthJson).not.toHaveBeenCalled();
  });

  it("creates a cascade via the API", async () => {
    mockAuthJson.mockResolvedValue({ success: true, cascade: makeCascade({ id: "rc2", orderNumber: "#1002" }) });
    render(<RefundCascadePage />);
    fireEvent.click(screen.getByRole("button", { name: "New Refund" }));
    fireEvent.change(screen.getByLabelText("Order ID *"), { target: { value: "ORD-2" } });
    fireEvent.change(screen.getByLabelText("Order Number *"), { target: { value: "#1002" } });
    fireEvent.change(screen.getByLabelText("Customer Name *"), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText("Product Title *"), { target: { value: "Mug" } });
    fireEvent.change(screen.getByLabelText("Order Amount ($) *"), { target: { value: "19.99" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Refund Cascade" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/refund-cascade", expect.objectContaining({
        action: "create", orderId: "ORD-2", orderNumber: "#1002", orderAmount: 19.99, reason: "defective",
      }));
    });
    expect(mockToast.success).toHaveBeenCalledWith("Refund cascade created");
    expect(mockMutate).toHaveBeenCalled();
  });

  it("advances non-monetary steps directly without confirmation", async () => {
    mockAuthJson.mockResolvedValue({ success: true, cascade: makeCascade({ status: "supplier_claimed" }) });
    render(<RefundCascadePage />);
    // Select the cascade, then File Supplier Claim (step index 1 — non-monetary)
    fireEvent.click(screen.getByText(/#1001 — Earbuds/));
    fireEvent.click(screen.getByRole("button", { name: "File Supplier Claim" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/refund-cascade", {
        action: "advance", id: "rc1", stepIndex: 1, success: true, notes: undefined,
      });
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("requires confirmation for monetary steps before calling the API", async () => {
    const approved = makeCascade({ status: "supplier_approved" });
    mockUseAPI.mockImplementation((url: string) =>
      url.includes("type=stats")
        ? { data: undefined, mutate: mockMutate, isLoading: false, error: undefined }
        : { data: { cascades: [approved] }, mutate: mockMutate, isLoading: false, error: undefined }
    );
    render(<RefundCascadePage />);
    fireEvent.click(screen.getByText(/#1001 — Earbuds/));
    fireEvent.click(screen.getByRole("button", { name: "Process Store Refund" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(mockAuthJson).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/refund-cascade", {
        action: "advance", id: "rc1", stepIndex: 3, success: true, notes: undefined,
      });
    });
  });

  it("deletes a cascade after confirmation", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<RefundCascadePage />);
    fireEvent.click(screen.getByRole("button", { name: "Delete this refund cascade" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/refund-cascade?id=rc1", undefined, "DELETE");
    });
    expect(mockToast.success).toHaveBeenCalledWith("Refund cascade deleted");
  });

  it("generates a dispute response email by id", async () => {
    mockAuthJson.mockResolvedValue({ success: true, response: "Dear John Doe, sorry about that." });
    render(<RefundCascadePage />);
    fireEvent.click(screen.getByText(/#1001 — Earbuds/));
    fireEvent.click(screen.getByRole("button", { name: "Generate Response Email" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/refund-cascade", { action: "dispute-response", id: "rc1" });
      expect(screen.getByText(/Dear John Doe/)).toBeTruthy();
    });
  });
});

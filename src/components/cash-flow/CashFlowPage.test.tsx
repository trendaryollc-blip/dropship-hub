import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();

const mockSnapshot = {
  id: "s1", currentBalance: 2500, availableBalance: 3000, pendingInflows: 800, pendingOutflows: 300,
  netPending: 500, runwayDays: 45, burnRate: 20, monthlyInflows: 5000, monthlyOutflows: 4000,
  cashConversionCycle: 14, forecast: [], calculatedAt: new Date().toISOString(),
};

function defaultUseAPIMock(url: string) {
  if (url.includes("type=forecast")) {
    return {
      data: {
        forecast: Array.from({ length: 30 }, (_, i) => ({
          date: `2026-10-${String(i + 1).padStart(2, "0")}`, inflows: i === 4 ? 800 : 0,
          outflows: i === 9 ? 300 : 0, net: 0, runningBalance: 2500,
        })),
      },
      mutate: mockMutate, isLoading: false, error: undefined,
    };
  }
  if (url.includes("type=alerts")) {
    return {
      data: { alerts: [{ type: "large_outflow", severity: "warning", title: "Large payment due", description: "Payment scheduled.", amount: 300, dueDate: "2026-10-10", createdAt: "", read: false }] },
      mutate: mockMutate, isLoading: false, error: undefined,
    };
  }
  if (url.includes("type=entries")) {
    return {
      data: {
        entries: [
          { id: "e1", type: "outflow", category: "supplier_payment", amount: 300, description: "Supplier order #123", status: "pending", expectedDate: "2026-10-10", recurring: false, createdAt: "" },
          { id: "e2", type: "inflow", category: "sales", amount: 800, description: "Weekly payout", status: "completed", expectedDate: "2026-10-05", recurring: false, createdAt: "" },
        ],
      },
      mutate: mockMutate, isLoading: false, error: undefined,
    };
  }
  return { data: { snapshot: mockSnapshot }, mutate: mockMutate, isLoading: false, error: undefined };
}

const mockUseAPI = vi.fn(defaultUseAPIMock);
vi.mock("@/hooks/useAPI", () => ({ useAPI: (url: string) => mockUseAPI(url) }));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock("@/components/ui/Toast", () => ({ useToast: () => mockToast }));

const mockAuthJson = vi.fn();
vi.mock("@/lib/auth-headers", () => ({ authJson: (...args: unknown[]) => mockAuthJson(...args) }));

import CashFlowPage from "./CashFlowPage";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAPI.mockReset().mockImplementation(defaultUseAPIMock);
});

describe("CashFlowPage", () => {
  it("renders header, KPI cards and entries list", () => {
    render(<CashFlowPage />);
    expect(screen.getByText("Cash Flow Timing")).toBeTruthy();
    expect(screen.getByText("$2,500")).toBeTruthy(); // current balance
    expect(screen.getByText("$800")).toBeTruthy(); // pending inflows
    expect(screen.getByText("Cash Flow Entries")).toBeTruthy();
    expect(screen.getByText("Supplier order #123")).toBeTruthy();
    expect(screen.getByText("Weekly payout")).toBeTruthy();
  });

  it("shows loading state", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: undefined, mutate: mockMutate,
      isLoading: url.includes("type=snapshot") || url.includes("type=forecast"),
      error: undefined,
    }));
    render(<CashFlowPage />);
    expect(screen.getByText(/Loading your cash flow/)).toBeTruthy();
  });

  it("shows error state with retry", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: undefined, mutate: mockMutate, isLoading: false,
      error: url.includes("type=snapshot") ? new Error("boom") : undefined,
    }));
    render(<CashFlowPage />);
    expect(screen.getByText(/Couldn't load your cash flow/)).toBeTruthy();
    fireEvent.click(screen.getByText("Retry"));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("renders alerts", () => {
    render(<CashFlowPage />);
    expect(screen.getByText("Large payment due")).toBeTruthy();
  });

  it("adds an entry via the API and refreshes all views", async () => {
    mockAuthJson.mockResolvedValue({ success: true, id: "e3" });
    render(<CashFlowPage />);
    fireEvent.click(screen.getByRole("button", { name: "Add Entry" })); // opens form (toggle becomes "Close")
    fireEvent.change(screen.getByLabelText("Amount *"), { target: { value: "120.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Entry" })); // submit
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/cash-flow", {
        action: "add_entry", type: "outflow", category: "supplier_payment",
        amount: 120.5, description: "", expectedDate: expect.any(String),
      });
    });
    expect(mockToast.success).toHaveBeenCalledWith("Entry added");
    expect(mockMutate).toHaveBeenCalled();
  });

  it("rejects invalid amounts without calling the API", async () => {
    render(<CashFlowPage />);
    fireEvent.click(screen.getByRole("button", { name: "Add Entry" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Entry" }));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Amount must be a positive number");
    });
    expect(mockAuthJson).not.toHaveBeenCalled();
  });

  it("deletes an entry with authed DELETE", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<CashFlowPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Delete entry" })[0]);
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/cash-flow?id=e1", undefined, "DELETE");
    });
    expect(mockToast.success).toHaveBeenCalledWith("Entry deleted");
  });

  it("marks an entry completed", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<CashFlowPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Mark completed" })[0]);
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/cash-flow", {
        action: "update_entry_status", id: "e1", status: "completed", actualDate: expect.any(String),
      });
    });
  });

  it("saves a new starting balance", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<CashFlowPage />);
    fireEvent.change(screen.getByLabelText("Starting balance"), { target: { value: "4321" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/cash-flow", { action: "set_balance", startingBalance: 4321 });
    });
    expect(mockToast.success).toHaveBeenCalledWith("Starting balance updated");
  });

  it("disables balance save while empty", () => {
    render(<CashFlowPage />);
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows empty entries state", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: url.includes("type=entries") ? { entries: [] } : undefined,
      mutate: mockMutate, isLoading: false, error: undefined,
    }));
    render(<CashFlowPage />);
    expect(screen.getByText(/No entries yet/)).toBeTruthy();
  });

  it("renders forecast charts with guarded money rendering", () => {
    render(<CashFlowPage />);
    expect(screen.getByText("30-Day Cash Flow Forecast")).toBeTruthy();
    expect(screen.getByText("Running Balance Projection")).toBeTruthy();
    expect(screen.getByText(/Today: /)).toBeTruthy();
    expect(screen.queryByText("$undefined")).toBeNull();
  });
});

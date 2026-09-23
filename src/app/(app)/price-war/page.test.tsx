import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();

const mockRule = {
  id: "r1", productTitle: "Wireless Earbuds", myPrice: 29.99, cost: 12, floorPrice: 15,
  minMargin: 20, strategy: "match_lowest", strategyConfig: {},
  platforms: ["amazon"], competitorUrls: ["https://example.com/c"], status: "active",
  lastChecked: new Date().toISOString(), createdAt: new Date().toISOString(),
};

const mockStats = {
  totalRules: 1, activeRules: 1, pausedRules: 0, triggeredToday: 0,
  totalAdjustments: 0, avgMarginMaintained: 60, totalSavingsFromAdjustments: 0,
};

function defaultUseAPIMock(url: string) {
  if (url.includes("type=stats")) {
    return { data: { stats: mockStats }, mutate: mockMutate, isLoading: false, error: undefined };
  }
  if (url.includes("history")) {
    return { data: { logs: [] }, mutate: mockMutate, isLoading: false, error: undefined };
  }
  return { data: { rules: [mockRule] }, mutate: mockMutate, isLoading: false, error: undefined };
}

const mockUseAPI = vi.fn(defaultUseAPIMock);
vi.mock("@/hooks/useAPI", () => ({ useAPI: (url: string) => mockUseAPI(url) }));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1" } }),
}));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock("@/components/ui/Toast", () => ({ useToast: () => mockToast }));

const mockAuthJson = vi.fn();
vi.mock("@/lib/auth-headers", () => ({ authJson: (...args: unknown[]) => mockAuthJson(...args) }));

// Tour touches localStorage in a way happy-dom's stub doesn't implement — stub it out.
vi.mock("@/components/ui/Tour", () => ({
  default: () => null,
  useTour: () => ({ isOpen: false, complete: vi.fn(), skip: vi.fn(), restart: vi.fn() }),
}));

import PriceWarPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAPI.mockReset().mockImplementation(defaultUseAPIMock);
});

describe("PriceWarPage", () => {
  it("renders header, stats and rules table", () => {
    render(<PriceWarPage />);
    expect(screen.getByText("Price War Bot")).toBeTruthy();
    expect(screen.getAllByText("Wireless Earbuds").length).toBeGreaterThan(0);
    expect(screen.getByText("Dry Run")).toBeTruthy();
    expect(screen.getByText("Execute Check")).toBeTruthy();
  });

  it("renders stats cards", () => {
    render(<PriceWarPage />);
    expect(screen.getAllByText("60%").length).toBeGreaterThan(0); // avg margin maintained
    expect(screen.getByText("1/1")).toBeTruthy(); // active/total
  });

  it("shows empty state when no rules exist", () => {
    mockUseAPI.mockImplementation((url: string) => {
      if (url.includes("type=stats")) return { data: { stats: { ...mockStats, totalRules: 0, activeRules: 0 } }, mutate: mockMutate, isLoading: false, error: undefined };
      if (url.includes("history")) return { data: { logs: [] }, mutate: mockMutate, isLoading: false, error: undefined };
      return { data: { rules: [] }, mutate: mockMutate, isLoading: false, error: undefined };
    });
    render(<PriceWarPage />);
    expect(screen.getByText(/No price rules yet/)).toBeTruthy();
  });

  it("dry run executes immediately without confirmation dialog", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<PriceWarPage />);
    fireEvent.click(screen.getByText("Dry Run"));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/ai/price-war/execute", { dryRun: true });
    });
    expect(mockToast.success).toHaveBeenCalledWith("Dry run completed — no prices changed");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("live execute requires a confirmation dialog first", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<PriceWarPage />);
    fireEvent.click(screen.getByText("Execute Check"));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(mockAuthJson).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Execute" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/ai/price-war/execute", { dryRun: false });
    });
    expect(mockToast.success).toHaveBeenCalledWith("Price check executed and adjustments applied");
  });

  it("live execute failure shows an error toast with the server message", async () => {
    mockAuthJson.mockRejectedValue(new Error("Daily cap reached"));
    render(<PriceWarPage />);
    fireEvent.click(screen.getByText("Execute Check"));
    fireEvent.click(await screen.findByRole("button", { name: "Execute" }));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Daily cap reached");
    });
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("toggles a rule via authed POST and toasts only on success", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<PriceWarPage />);
    fireEvent.click(screen.getByRole("button", { name: /Pause monitoring for Wireless Earbuds/ }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/ai/price-war", expect.objectContaining({
        status: "paused",
      }), "PUT");
    });
    expect(mockToast.success).toHaveBeenCalledWith("Rule paused");
  });

  it("toggle failure shows an error toast instead of success", async () => {
    mockAuthJson.mockRejectedValue(new Error("Unauthorized"));
    render(<PriceWarPage />);
    fireEvent.click(screen.getByRole("button", { name: /Pause monitoring for Wireless Earbuds/ }));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Unauthorized");
    });
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("deletes a rule through the confirm dialog via authed DELETE", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<PriceWarPage />);
    fireEvent.click(screen.getByRole("button", { name: /Delete price rule for Wireless Earbuds/ }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/ai/price-war?id=r1", undefined, "DELETE");
    });
    expect(mockToast.success).toHaveBeenCalledWith("Rule deleted");
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();

const mockReport = {
  id: "", productTitle: "Test Product", productImage: "", productUrl: "", category: "electronics",
  overallScore: 75, riskLevel: "medium" as const, canList: true,
  checks: [], flags: [], recommendations: ["Add brand info"], summary: "",
};

const mockCheck = {
  id: "c1", productTitle: "Test Product", productImage: "", productUrl: "", category: "electronics",
  overallScore: 75, riskLevel: "medium" as const, canList: true, checkTypes: ["trademark"],
  flagCount: 1, violationCount: 0, inputs: {}, report: mockReport, createdAt: "2026-09-20T00:00:00Z",
};

const mockStats = {
  totalChecks: 6, passedChecks: 3, warningChecks: 2, violationChecks: 1, blockedProducts: 0,
  avgScore: 72, riskBreakdown: { safe: 1, low: 2, medium: 2, high: 1, blocked: 0 }, marketBreakdown: {},
};

function defaultUseAPIMock(url: string) {
  if (url.includes("type=stats")) {
    return { data: { stats: mockStats }, mutate: mockMutate, isLoading: false, error: undefined };
  }
  return { data: { checks: [mockCheck] }, mutate: mockMutate, isLoading: false, error: undefined };
}

const mockUseAPI = vi.fn(defaultUseAPIMock);
vi.mock("@/hooks/useAPI", () => ({ useAPI: (url: string) => mockUseAPI(url) }));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock("@/components/ui/Toast", () => ({ useToast: () => mockToast }));

const mockAuthJson = vi.fn();
const mockGetAuthHeaders = vi.fn(async () => ({}));
vi.mock("@/lib/auth-headers", () => ({
  authJson: (...args: unknown[]) => mockAuthJson(...args),
  getAuthHeaders: (...args: unknown[]) => mockGetAuthHeaders(...args),
}));

import CompliancePage from "./CompliancePage";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAPI.mockReset().mockImplementation(defaultUseAPIMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CompliancePage", () => {
  it("renders header, stats and tabs", () => {
    render(<CompliancePage />);
    expect(screen.getByText("Compliance Checker")).toBeTruthy();
    expect(screen.getByText("Total Checks")).toBeTruthy();
    expect(screen.getByText("Avg Score")).toBeTruthy();
    expect(screen.getByText("New Check")).toBeTruthy();
    expect(screen.getByText("History (1)")).toBeTruthy();
  });

  it("shows stats loading and error states", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: undefined, mutate: mockMutate, isLoading: url.includes("type=stats"),
      error: url.includes("type=stats") ? new Error("boom") : undefined,
    }));
    render(<CompliancePage />);
    expect(screen.getByText(/Loading compliance stats/)).toBeTruthy();
  });

  it("shows history error state with retry", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: undefined, mutate: mockMutate, isLoading: false,
      error: !url.includes("type=stats") ? new Error("boom") : undefined,
    }));
    render(<CompliancePage />);
    fireEvent.click(screen.getByText("History (0)"));
    expect(screen.getByText(/Couldn't load your compliance history/)).toBeTruthy();
    fireEvent.click(screen.getByText("Retry"));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("shows empty history state", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: url.includes("type=stats") ? { stats: mockStats } : { checks: [] },
      mutate: mockMutate, isLoading: false, error: undefined,
    }));
    render(<CompliancePage />);
    fireEvent.click(screen.getByText("History (0)"));
    expect(screen.getByText("No compliance checks yet")).toBeTruthy();
  });

  it("renders the check form on the New Check tab", () => {
    render(<CompliancePage />);
    expect(screen.getByText("New Check")).toBeTruthy();
  });

  it("disables export buttons when history is empty", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: url.includes("type=stats") ? { stats: mockStats } : { checks: [] },
      mutate: mockMutate, isLoading: false, error: undefined,
    }));
    render(<CompliancePage />);
    fireEvent.click(screen.getByText("History (0)"));
    expect((screen.getByRole("button", { name: "Export CSV" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Export JSON" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("downloads an authenticated CSV export", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["csv"], { type: "text/csv" })),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CompliancePage />);
    fireEvent.click(screen.getByText("History (1)"));
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/compliance?type=export&format=csv", { headers: {} });
      expect(mockGetAuthHeaders).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith("CSV exported");
    });
  });

  it("shows an error toast instead of downloading an error blob on failed export", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Unauthorized" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CompliancePage />);
    fireEvent.click(screen.getByText("History (1)"));
    fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Unauthorized");
    });
    expect(mockToast.success).not.toHaveBeenCalledWith("JSON exported");
  });
});

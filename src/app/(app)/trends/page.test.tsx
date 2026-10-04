import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
const searchParamsState = vi.hoisted(() => ({ current: new URLSearchParams() }));

const mockEntry = {
  id: "w1", keyword: "posture corrector", category: "health",
  alertOnRising: true, alertOnPeak: true, alertOnSaturation: false,
  createdAt: new Date().toISOString(),
};

function defaultUseAPIMock(url: string) {
  if (url.includes("watchlist")) {
    return { data: { entries: [mockEntry] }, mutate: mockMutate, isLoading: false, error: undefined };
  }
  if (url.includes("rising-stars")) {
    return { data: { risingStars: [] }, mutate: mockMutate, isLoading: false, error: undefined };
  }
  if (url.includes("predictions")) {
    return { data: { predictions: [] }, mutate: mockMutate, isLoading: false, error: undefined };
  }
  return {
    data: {
      trending: [
        { id: "t1", keyword: "posture corrector", direction: "rising", growth: 34, volume: 1200 },
        { id: "t2", keyword: "guided journal", direction: "stable", growth: 2, volume: 800 },
      ],
      risingStars: [],
    },
    mutate: mockMutate, isLoading: false, error: undefined,
  };
}

const mockUseAPI = vi.fn(defaultUseAPIMock);
vi.mock("@/hooks/useAPI", () => ({ useAPI: (url: string) => mockUseAPI(url) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParamsState.current }));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1" } }),
}));

vi.mock("@/components/ai/VoiceInput", () => ({
  default: () => null,
}));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock("@/components/ui/Toast", () => ({ useToast: () => mockToast }));

const mockAuthJson = vi.fn();
vi.mock("@/lib/auth-headers", () => ({ authJson: (...args: unknown[]) => mockAuthJson(...args) }));

import TrendsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAPI.mockReset().mockImplementation(defaultUseAPIMock);
  searchParamsState.current = new URLSearchParams();
});

describe("TrendsPage", () => {
  it("renders header, all six tabs and dashboard trending items", () => {
    render(<TrendsPage />);
    expect(screen.getByText("Trend Predictor")).toBeTruthy();
    expect(screen.getByText("RULE-BASED")).toBeTruthy();
    for (const tab of ["Dashboard", "Analyze", "Compare", "Bulk", "Predictions", "Watchlist"]) {
      expect(screen.getByText(tab)).toBeTruthy();
    }
    expect(screen.getAllByText("posture corrector").length).toBeGreaterThan(0);
  });

  it("opens Analyze with product keyword and category prefilled", () => {
    searchParamsState.current = new URLSearchParams("keyword=Wireless+Headphones&category=Electronics&imageUrl=https%3A%2F%2Fimages.example.com%2Fheadphones.jpg");
    render(<TrendsPage />);
    expect((screen.getByLabelText("Search keyword") as HTMLInputElement).value).toBe("Wireless Headphones");
    expect((screen.getByLabelText("Category") as HTMLInputElement).value).toBe("Electronics");
    expect((screen.getByLabelText("Find product matches by image") as HTMLInputElement).value).toBe("https://images.example.com/headphones.jpg");
    expect((screen.getByRole("button", { name: "Analyze Trend" }) as HTMLButtonElement).disabled).toBe(false);
    expect(mockAuthJson).not.toHaveBeenCalled();
  });

  it("searches by image and analyzes a selected marketplace match", async () => {
    mockAuthJson
      .mockResolvedValueOnce({ matches: [{ title: "Portable USB-C Desk Fan", platform: "amazon", url: "https://amazon.com/item/1", matchType: "exact" }] })
      .mockResolvedValueOnce({ prediction: { id: "p1", productIdea: "Portable USB-C Desk Fan" }, signals: [] });
    searchParamsState.current = new URLSearchParams("keyword=Bundle+Sale+2025&imageUrl=https%3A%2F%2Fimages.example.com%2Ffan.jpg");
    render(<TrendsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Search image" }));
    fireEvent.click(await screen.findByRole("button", { name: "Use amazon image match: Portable USB-C Desk Fan" }));
    expect((screen.getByLabelText("Search keyword") as HTMLInputElement).value).toBe("Portable USB-C Desk Fan");

    fireEvent.click(screen.getByRole("button", { name: "Analyze Trend" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenNthCalledWith(1, "/api/products/match-image", {
        imageUrl: "https://images.example.com/fan.jpg",
      });
      expect(mockAuthJson).toHaveBeenNthCalledWith(2, "/api/ai/trends", expect.objectContaining({
        keyword: "Portable USB-C Desk Fan",
        timeframe: "30d",
      }));
    });
  });

  it("analyzes a keyword via authed POST and shows the result", async () => {
    mockAuthJson.mockResolvedValue({ prediction: { id: "p1", productIdea: "posture corrector" }, signals: [] });
    render(<TrendsPage />);
    fireEvent.click(screen.getByText("Analyze"));
    fireEvent.change(screen.getByLabelText("Search keyword"), { target: { value: "posture corrector" } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze Trend" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/ai/trends", expect.objectContaining({
        keyword: "posture corrector", timeframe: "30d",
      }));
    });
  });

  it("analyze failure shows an error toast", async () => {
    mockAuthJson.mockRejectedValue(new Error("Rate limited"));
    render(<TrendsPage />);
    fireEvent.click(screen.getByText("Analyze"));
    fireEvent.change(screen.getByLabelText("Search keyword"), { target: { value: "test" } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze Trend" }));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Rate limited");
      expect(screen.getByRole("alert").textContent).toContain("Rate limited");
    });
  });

  it("shows provider setup guidance when no live trend data is available", async () => {
    mockAuthJson.mockRejectedValue(new Error("No live trend data for this keyword — connect a trends source (Google Trends API)"));
    render(<TrendsPage />);
    fireEvent.click(screen.getByText("Analyze"));
    fireEvent.change(screen.getByLabelText("Search keyword"), { target: { value: "test product" } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze Trend" }));

    expect((await screen.findByRole("alert")).textContent).toContain("SERPAPI_KEYS");
    expect(screen.getByRole("alert").textContent).toContain("KEEPA_API_KEYS");
  });

  it("adds a watchlist entry via authed POST with a success toast", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<TrendsPage />);
    fireEvent.click(screen.getByText("Watchlist"));
    fireEvent.change(screen.getByLabelText("Watchlist keyword"), { target: { value: "jade roller" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/ai/trends/watchlist", expect.objectContaining({
        keyword: "jade roller",
      }));
    });
    expect(mockToast.success).toHaveBeenCalledWith("Added to watchlist");
  });

  it("removes a watchlist entry after confirmation via authed DELETE", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<TrendsPage />);
    fireEvent.click(screen.getByText("Watchlist"));
    fireEvent.click(screen.getByRole("button", { name: /Remove posture corrector from watchlist/ }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(mockAuthJson).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/ai/trends/watchlist?id=w1", undefined, "DELETE");
    });
    expect(mockToast.success).toHaveBeenCalledWith("Removed from watchlist");
  });

  it("shows empty watchlist state", () => {
    mockUseAPI.mockImplementation((url: string) => {
      if (url.includes("watchlist")) return { data: { entries: [] }, mutate: mockMutate, isLoading: false, error: undefined };
      return defaultUseAPIMock(url);
    });
    render(<TrendsPage />);
    fireEvent.click(screen.getByText("Watchlist"));
    expect(screen.getByText(/No watchlist entries/)).toBeTruthy();
  });
});

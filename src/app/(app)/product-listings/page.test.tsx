import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();

function defaultUseAPIMock(url: string) {
  if (url.includes("type=stats")) {
    return {
      data: { stats: { totalGenerated: 3, byPlatform: { amazon: 2, etsy: 1 }, avgOptimizationScore: 84 } },
      mutate: mockMutate, isLoading: false, error: undefined,
    };
  }
  return {
    data: {
      listings: [
        { id: "l1", platform: "amazon", title: "Wireless Earbuds Pro", description: "Great sound with noise cancelling", price: 29.99, keywords: ["earbuds", "bluetooth"], optimizationScore: 88, seoTags: ["audio", "wireless"] },
      ],
    },
    mutate: mockMutate, isLoading: false, error: undefined,
  };
}

const mockUseAPI = vi.fn(defaultUseAPIMock);
vi.mock("@/hooks/useAPI", () => ({ useAPI: (url: string) => mockUseAPI(url) }));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1" } }),
}));

const mockSearchParams = vi.fn(() => ({
  get: (key: string) => ({ platform: "amazon" }[key] ?? null),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams(),
}));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock("@/components/ui/Toast", () => ({ useToast: () => mockToast }));

const mockAuthJson = vi.fn();
vi.mock("@/lib/auth-headers", () => ({ authJson: (...args: unknown[]) => mockAuthJson(...args) }));

vi.mock("@/lib/clipboard", () => ({ copyToClipboard: vi.fn().mockResolvedValue(true) }));

vi.mock("@/components/listings/intelligence", () => ({
  URLImporter: () => null,
  CompetitorPanel: () => null,
  ListingPreview: () => null,
  MarketInsightsPanel: () => null,
  SmartAutofill: () => null,
}));

import ProductListingsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAPI.mockReset().mockImplementation(defaultUseAPIMock);
});

describe("ProductListingsPage", () => {
  it("renders header, platform tabs and saved listings", () => {
    render(<ProductListingsPage />);
    expect(screen.getByText("Listing Generator")).toBeTruthy();
    expect(screen.getByText("saved")).toBeTruthy();
    fireEvent.click(screen.getByText("saved"));
    expect(screen.getByText("Wireless Earbuds Pro")).toBeTruthy();
    expect(screen.getByText("88%")).toBeTruthy();
  });

  it("labels the score as a checklist score and reports keyword demand as untracked", async () => {
    mockAuthJson.mockResolvedValue({
      listing: {
        id: "gen1",
        platform: "amazon",
        title: "Test Product",
        description: "A test description",
        bulletPoints: ["Material: Cotton"],
        seoTags: ["test"],
        characterCounts: { title: 12, description: 19 },
        optimizationScore: 72,
        generatedAt: "2026-01-01T00:00:00.000Z",
      },
      alternatives: [],
      keywordSuggestions: null,
      generationTime: 5,
      provider: "listing-engine",
    });
    render(<ProductListingsPage />);
    fireEvent.change(screen.getByPlaceholderText("e.g. Wireless Bluetooth Earbuds"), { target: { value: "Test Product" } });
    fireEvent.change(screen.getByPlaceholderText("Product description..."), { target: { value: "A test description" } });
    fireEvent.change(screen.getByPlaceholderText("29.99"), { target: { value: "19.99" } });
    fireEvent.change(screen.getByPlaceholderText("Electronics"), { target: { value: "Electronics" } });
    fireEvent.click(screen.getByText("Generate Optimized Listing"));
    await waitFor(() => expect(mockAuthJson).toHaveBeenCalled());
    fireEvent.click(screen.getByText("Competitors"));
    expect(screen.getByText("72% checklist score")).toBeTruthy();
    expect(screen.getByText("Keyword demand not tracked")).toBeTruthy();
    expect(screen.queryByText(/monthly/)).toBeNull();
  });

  it("shows empty saved state", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: url.includes("type=stats")
        ? { stats: { totalGenerated: 0, byPlatform: {}, avgOptimizationScore: 0 } }
        : { listings: [] },
      mutate: mockMutate, isLoading: false, error: undefined,
    }));
    render(<ProductListingsPage />);
    fireEvent.click(screen.getByText("saved"));
    expect(screen.getByText(/No saved listings yet/)).toBeTruthy();
  });

  it("shows saved listing stats", () => {
    render(<ProductListingsPage />);
    fireEvent.click(screen.getByText("saved"));
    expect(screen.getByText("Total Generated")).toBeTruthy();
    expect(screen.getByText("84%")).toBeTruthy(); // avg score
  });

  it("deletes a saved listing after confirmation via authed DELETE", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<ProductListingsPage />);
    fireEvent.click(screen.getByText("saved"));
    fireEvent.click(screen.getByRole("button", { name: /Delete saved listing Wireless Earbuds Pro/ }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(mockAuthJson).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/ai/listings?id=l1", undefined, "DELETE");
    });
    expect(mockToast.success).toHaveBeenCalledWith("Listing deleted");
    expect(mockMutate).toHaveBeenCalled();
  });
});

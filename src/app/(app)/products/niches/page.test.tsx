import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { NicheData } from "@/types/niches";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
const mockPush = vi.fn();

function makeNiche(overrides: Partial<NicheData>): NicheData {
  return {
    id: "n1",
    name: "Wireless Earbuds",
    icon: "🎧",
    image: "/earbuds.jpg",
    category: "Electronics",
    heat: 85,
    productCount: 1200,
    avgMargin: 35,
    growth: 22,
    trend: "up",
    trendDirection: "rising",
    weeklyData: [40, 55, 62, 70, 78, 85],
    demandSparkline: [40, 55, 62, 70, 78, 85],
    scores: { demand: 80, profit: 70, competition: 60, trend: 75, seasonality: 50 },
    overallScore: 75,
    grade: "A",
    topProduct: "Pro Earbuds X1",
    topProductPrice: 15,
    topProductMargin: 45,
    aiInsight: "High demand niche",
    competitionLevel: "medium",
    saturation: 40,
    avgSellingPrice: 35,
    bestPlatforms: ["Amazon"],
    seasonality: "Year-round",
    riskLevel: "low",
    topSuppliers: [],
    relatedNiches: [],
    keywords: ["earbuds", "audio"],
    estimatedMonthlyRevenue: 12500,
    profitPerUnit: 12.5,
    avgShippingDays: 8,
    avgReturnRate: 3.2,
    topProducts: [],
    competition: { storeCount: 150, avgStoreRating: 4.2, priceRange: { min: 10, max: 50, avg: 35 }, topPlatforms: ["Amazon"], saturationLevel: "medium" },
    geographicDemand: [],
    seasonalTrend: [],
    ...overrides,
  };
}

const mockNiches: NicheData[] = [
  makeNiche({}),
  makeNiche({ id: "n2", name: "Yoga Mats", category: "Sports", heat: 64, growth: 9, topProduct: "Eco Yoga Mat", keywords: ["yoga"] }),
];

function defaultUseAPIMock() {
  return { data: { niches: mockNiches }, mutate: mockMutate, isLoading: false, error: undefined };
}

const mockUseAPI = vi.fn(defaultUseAPIMock);
vi.mock("@/hooks/useAPI", () => ({ useAPI: () => mockUseAPI() }));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt || "image"} />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children?: ReactNode }) => <a href={href}>{children}</a>,
}));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock("@/components/ui/Toast", () => ({ useToast: () => mockToast }));

const mockAuthJson = vi.fn();
vi.mock("@/lib/auth-headers", () => ({ authJson: (...args: unknown[]) => mockAuthJson(...args) }));

import NichesPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAPI.mockReset().mockImplementation(defaultUseAPIMock);
  mockAuthJson.mockResolvedValue({});
});

describe("NichesPage", () => {
  it("renders header, stats and niche cards", () => {
    render(<NichesPage />);
    expect(screen.getByText("Niche Explorer")).toBeTruthy();
    expect(screen.getByText("2 niches found")).toBeTruthy();
    expect(screen.getAllByText("Wireless Earbuds").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Yoga Mats").length).toBeGreaterThan(0);
  });

  it("filters niches by search term", () => {
    render(<NichesPage />);
    fireEvent.change(screen.getByPlaceholderText("Search niches..."), { target: { value: "yoga" } });
    expect(screen.getByText("1 niches found")).toBeTruthy();
    // The non-matching card is gone (hero stats intentionally cover all niches).
    expect(screen.queryByText("Top: Pro Earbuds X1")).toBeNull();
    expect(screen.getByText("Top: Eco Yoga Mat")).toBeTruthy();
  });

  it("shows error state and retries the fetch", () => {
    mockUseAPI.mockImplementation(() => ({ data: undefined, mutate: mockMutate, isLoading: false, error: new Error("Network down") }));
    render(<NichesPage />);
    expect(screen.getByText("Failed to load niches")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();
    fireEvent.click(screen.getByText("Retry"));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("creates a mission for the niche and navigates to missions", async () => {
    render(<NichesPage />);
    fireEvent.click(screen.getAllByTitle("Start Mission")[0]);
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith(
        "/api/ai/missions",
        expect.objectContaining({ action: "create", text: expect.stringContaining("Wireless Earbuds") }),
        "PATCH"
      );
    });
    expect(mockToast.success).toHaveBeenCalledWith('Mission created for "Wireless Earbuds"');
    expect(mockPush).toHaveBeenCalledWith("/missions");
  });

  it("adds the niche keyword to the trend watchlist", async () => {
    render(<NichesPage />);
    fireEvent.click(screen.getAllByTitle("Add to Watchlist")[0]);
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith(
        "/api/ai/trends/watchlist",
        expect.objectContaining({ keyword: "Wireless Earbuds", category: "Electronics", alertOnRising: true })
      );
    });
    expect(mockToast.success).toHaveBeenCalledWith('Added "Wireless Earbuds" to watchlist');
  });

  it("opens AI Listings prefilled with the niche top product", () => {
    render(<NichesPage />);
    fireEvent.click(screen.getAllByTitle("Generate Listing")[0]);
    expect(mockPush).toHaveBeenCalledWith("/product-listings?title=Pro+Earbuds+X1&category=Electronics");
  });

  it("clears the comparison when the Comparing button is clicked", () => {
    render(<NichesPage />);
    fireEvent.click(screen.getAllByTitle("Compare")[0]);
    fireEvent.click(screen.getAllByTitle("Compare")[1]);
    expect(screen.getByText("Comparing 2 niches")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Comparing (2)" }));
    expect(screen.queryByText("Comparing 2 niches")).toBeNull();
  });
});

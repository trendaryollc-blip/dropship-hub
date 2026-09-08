import { describe, it, expect, vi, beforeEach } from "vitest";
import { doc, setDoc, deleteDoc, getDocs, collection, query, orderBy, limit, where } from "firebase/firestore";
import { addTrendWatchlistEntry, getTrendWatchlist, deleteTrendWatchlistEntry, addTrendAlert, getTrendAlerts, addTrendPrediction, getTrendPredictions, getTrendDashboard } from "./trend-predictor";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "mock-ts"),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("./utils", () => ({
  handleFirestoreError: vi.fn((_ctx: string, err: unknown) => { throw err; }),
}));

const mockDoc = vi.mocked(doc);
const mockSetDoc = vi.mocked(setDoc);
const mockDeleteDoc = vi.mocked(deleteDoc);
const mockGetDocs = vi.mocked(getDocs);
const mockCollection = vi.mocked(collection);
const mockQuery = vi.mocked(query);
const mockWhere = vi.mocked(where);
const mockOrderBy = vi.mocked(orderBy);
const mockLimit = vi.mocked(limit);

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue({ id: "mock-id" } as any);
  mockCollection.mockReturnValue("colRef" as any);
  mockQuery.mockReturnValue("q" as any);
  mockWhere.mockReturnValue("w" as any);
  mockOrderBy.mockReturnValue("ob" as any);
  mockLimit.mockReturnValue("l" as any);
  mockSetDoc.mockResolvedValue(undefined as any);
  mockDeleteDoc.mockResolvedValue(undefined as any);
});

describe("addTrendWatchlistEntry", () => {
  it("creates doc in trendWatchlist collection", async () => {
    const entry = {
      keyword: "earbuds",
      category: "electronics",
      alertOnRising: true,
      alertOnPeak: true,
      alertOnSaturation: true,
    };
    const id = await addTrendWatchlistEntry("uid1", entry);
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "users", "uid1", "trendWatchlist");
    expect(id).toBeDefined();
  });
});

describe("getTrendWatchlist", () => {
  it("fetches watchlist entries", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    const result = await getTrendWatchlist("uid1");
    expect(result).toEqual([]);
  });
});

describe("deleteTrendWatchlistEntry", () => {
  it("deletes entry by id", async () => {
    const result = await deleteTrendWatchlistEntry("uid1", "entry-1");
    expect(result).toBe(true);
  });
});

describe("addTrendAlert", () => {
  it("creates doc in trendAlerts collection", async () => {
    const alert = {
      type: "rising_star",
      title: "Rising Star Detected",
      message: "Product X is trending",
      severity: "info",
      read: false,
    };
    const id = await addTrendAlert("uid1", alert);
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "users", "uid1", "trendAlerts");
    expect(id).toBeDefined();
  });
});

describe("addTrendPrediction", () => {
  it("creates doc in trendPredictions collection", async () => {
    const prediction = {
      productIdea: "Wireless Earbuds",
      category: "Electronics",
      trendScore: 80,
      confidence: "high",
      direction: "rising",
      predictedPeak: "2026-10-01",
      timeToPeak: "30 days",
      saturationRisk: 30,
      competitionLevel: "low",
      reasoning: "Strong growth",
      relatedKeywords: ["wireless", "earbuds"],
      suggestedPlatforms: ["amazon", "shopify"],
      estimatedMargin: 45,
    };
    const id = await addTrendPrediction("uid1", prediction);
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "users", "uid1", "trendPredictions");
    expect(id).toBeDefined();
  });
});

describe("getTrendDashboard", () => {
  it("returns dashboard stats for empty data", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    const stats = await getTrendDashboard("uid1");
    expect(stats.activeTrends).toBe(0);
    expect(stats.predictionsToday).toBe(0);
    expect(stats.alertsUnread).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { exportPredictionsToCSV, exportWatchlistToCSV, exportAnalysisToCSV, exportRisingStarsToCSV } from "../trends/export";
import type { TrendPrediction, RisingStar, TrendWatchlistEntry } from "@/types/trend-predictor";

// Mock DOM APIs
const mockClick = vi.fn();
let capturedContent = "";
let capturedFilename = "";

beforeEach(() => {
  vi.clearAllMocks();
  capturedContent = "";
  capturedFilename = "";

  vi.stubGlobal("document", {
    createElement: vi.fn(() => ({
      setAttribute: vi.fn(),
      click: mockClick,
    })),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
  });

  vi.stubGlobal("URL", {
    createObjectURL: vi.fn((content: Blob) => {
      capturedContent = content as unknown as string;
      return "blob:mock-url";
    }),
    revokeObjectURL: vi.fn(),
  });

  vi.stubGlobal("Blob", vi.fn((parts: unknown[]) => ({
    toString: () => String(parts),
    size: 100,
    type: "text/csv",
  })));
});

const mockPrediction: TrendPrediction = {
  id: "pred-1",
  productIdea: "wireless earbuds",
  category: "electronics",
  trendScore: 85,
  confidence: "high",
  direction: "rising",
  predictedPeak: "2024-03-15",
  timeToPeak: "30 days",
  saturationRisk: 25,
  competitionLevel: "low",
  reasoning: "Strong upward trend",
  signals: [],
  relatedKeywords: ["bluetooth headphones", "earbuds"],
  suggestedPlatforms: ["tiktok", "amazon"],
  estimatedMargin: 45,
  createdAt: "2024-01-15T00:00:00Z",
};

const mockWatchlist: TrendWatchlistEntry[] = [
  {
    id: "w-1",
    keyword: "yoga mat",
    category: "fitness",
    addedAt: "2024-01-10",
    alertOnRising: true,
    alertOnPeak: false,
    alertOnSaturation: true,
  },
];

const mockRisingStars: RisingStar[] = [
  {
    id: "rs-1",
    productKeyword: "portable charger",
    category: "electronics",
    growthVelocity: 75,
    competitionScore: 20,
    opportunityScore: 82,
    currentVolume: 15000,
    platforms: ["tiktok", "instagram"],
    firstSeen: "2024-01-01",
    lastUpdated: "2024-01-15",
    status: "rising",
    reason: "Growing steadily",
  },
];

describe("trends/export", () => {
  describe("exportPredictionsToCSV", () => {
    it("generates CSV with correct headers", () => {
      exportPredictionsToCSV([mockPrediction]);
      expect(mockClick).toHaveBeenCalled();
    });

    it("handles empty predictions array", () => {
      exportPredictionsToCSV([]);
      expect(mockClick).toHaveBeenCalled();
    });

    it("handles special characters in keywords", () => {
      const pred = { ...mockPrediction, productIdea: 'keyword with "quotes" and, commas' };
      exportPredictionsToCSV([pred]);
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe("exportWatchlistToCSV", () => {
    it("generates CSV for watchlist", () => {
      exportWatchlistToCSV(mockWatchlist);
      expect(mockClick).toHaveBeenCalled();
    });

    it("handles empty watchlist", () => {
      exportWatchlistToCSV([]);
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe("exportAnalysisToCSV", () => {
    it("generates CSV with signals and summary", () => {
      const signals = [
        { platform: "google_trends", volume: 10000, growthRate: 25, velocity: 60, acceleration: 20, saturationLevel: 30 },
      ];
      exportAnalysisToCSV("wireless earbuds", signals, mockPrediction);
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe("exportRisingStarsToCSV", () => {
    it("generates CSV for rising stars", () => {
      exportRisingStarsToCSV(mockRisingStars);
      expect(mockClick).toHaveBeenCalled();
    });

    it("handles empty rising stars", () => {
      exportRisingStarsToCSV([]);
      expect(mockClick).toHaveBeenCalled();
    });
  });
});

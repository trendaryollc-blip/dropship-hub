import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  getMatchResults,
  saveMatchResult,
} from "./supplier-match";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => "mock-ts"),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("./utils", () => ({
  handleFirestoreError: vi.fn((_ctx: string, err: unknown) => {
    throw err;
  }),
}));

const mockDoc = vi.mocked(doc);
const mockSetDoc = vi.mocked(setDoc);
const mockGetDocs = vi.mocked(getDocs);
const mockCollection = vi.mocked(collection);
const mockQuery = vi.mocked(query);
const mockOrderBy = vi.mocked(orderBy);
const mockLimit = vi.mocked(limit);

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue("docRef" as any);
  mockCollection.mockReturnValue("colRef" as any);
  mockQuery.mockReturnValue("q" as any);
  mockOrderBy.mockReturnValue("ob" as any);
  mockLimit.mockReturnValue("l" as any);
  mockSetDoc.mockResolvedValue(undefined as any);
});

describe("getMatchResults", () => {
  it("returns match results", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "m1", data: () => ({ id: "match-1", recommendations: [] }) }],
    } as any);

    const result = await getMatchResults("uid1");
    expect(result).toHaveLength(1);
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("fail"));
    await expect(getMatchResults("uid1")).rejects.toThrow("fail");
  });
});

describe("saveMatchResult", () => {
  it("saves match result with merge", async () => {
    await saveMatchResult("uid1", {
      id: "match-1",
      userId: "uid1",
      storeProfile: { niche: "Fashion", targetAudience: "", priceRange: { min: 0, max: 100 }, monthlyVolume: 0, priorities: { speed: 50, price: 50, quality: 50, reliability: 50 } },
      generatedAt: "",
      recommendations: [],
      portfolioSummary: { totalSuppliers: 0, estimatedMonthlyCost: 0, estimatedAvgMargin: 0, riskScore: 0, coverageScore: 0 },
    });
    expect(mockSetDoc).toHaveBeenCalled();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(saveMatchResult("uid1", {} as any)).rejects.toThrow("write fail");
  });
});

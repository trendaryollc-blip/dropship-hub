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
  getNicheScores,
  saveNicheScores,
} from "./supplier-niche";

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

describe("getNicheScores", () => {
  it("returns niche scores", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: "n1", data: () => ({ supplierId: "sup1", nicheScore: 85 }) },
      ],
    } as any);

    const result = await getNicheScores("uid1");
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("n1");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getNicheScores("uid1")).rejects.toThrow("query fail");
  });
});

describe("saveNicheScores", () => {
  it("saves niche scores with merge", async () => {
    await saveNicheScores("uid1", "sup1", {
      supplierName: "Test",
      nicheScore: 85,
      competitiveDensity: 30,
      saturationLevel: "low",
      uniqueProducts: 20,
      trendingProducts: 5,
      opportunityScore: 90,
      categoryBreakdown: [],
    });
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", expect.objectContaining({ supplierId: "sup1" }), { merge: true });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(saveNicheScores("uid1", "sup1", {} as any)).rejects.toThrow("write fail");
  });
});

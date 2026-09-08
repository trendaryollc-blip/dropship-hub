import { describe, it, expect, vi, beforeEach } from "vitest";
import { doc, setDoc, updateDoc, getDocs, collection, query, orderBy, limit, where, serverTimestamp } from "firebase/firestore";
import { addBudgetRecommendation, getBudgetRecommendations, getBudgetRecommendationsByStatus, updateBudgetRecommendation } from "./budget-recommendations";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => "mock-ts"),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("./utils", () => ({
  handleFirestoreError: vi.fn((_ctx: string, err: unknown) => { throw err; }),
}));

const mockDoc = vi.mocked(doc);
const mockSetDoc = vi.mocked(setDoc);
const mockUpdateDoc = vi.mocked(updateDoc);
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
  mockUpdateDoc.mockResolvedValue(undefined as any);
});

const validRec = {
  type: "scale_up" as const,
  campaignId: "camp1",
  campaignName: "Test Campaign",
  currentBudget: 50,
  recommendedBudget: 75,
  reason: "ROAS is above 3x for 7 days",
  expectedImpact: { roasChange: 0.5, revenueChange: 200, confidence: 0.85 },
  status: "pending" as const,
  expiresAt: "2025-02-01",
};

describe("addBudgetRecommendation", () => {
  it("creates auto-ID doc with correct collection path", async () => {
    await addBudgetRecommendation("uid1", validRec);
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "budgetRecommendations");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", expect.objectContaining({
      type: "scale_up",
      campaignId: "camp1",
      campaignName: "Test Campaign",
      currentBudget: 50,
      recommendedBudget: 75,
      status: "pending",
    }));
  });

  it("throws on invalid type", async () => {
    await expect(addBudgetRecommendation("uid1", { ...validRec, type: "invalid" as any })).rejects.toThrow();
  });
});

describe("getBudgetRecommendations", () => {
  it("returns recommendations with default limit 50", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "r1", data: () => ({ ...validRec, createdAt: "ts" }) }],
    } as any);
    const result = await getBudgetRecommendations("uid1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("r1");
  });
});

describe("getBudgetRecommendationsByStatus", () => {
  it("queries with where clause for status", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getBudgetRecommendationsByStatus("uid1", "pending");
    expect(mockQuery).toHaveBeenCalled();
  });
});

describe("updateBudgetRecommendation", () => {
  it("calls updateDoc with status update", async () => {
    await updateBudgetRecommendation("uid1", "entry1", { status: "accepted" });
    expect(mockUpdateDoc).toHaveBeenCalledWith("docRef", { status: "accepted" });
  });
});

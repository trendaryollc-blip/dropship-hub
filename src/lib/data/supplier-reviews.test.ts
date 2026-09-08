import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  getReviews,
  createReview,
  getCommunityScore,
} from "./supplier-reviews";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
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
const mockGetDoc = vi.mocked(getDoc);
const mockGetDocs = vi.mocked(getDocs);
const mockCollection = vi.mocked(collection);
const mockQuery = vi.mocked(query);
const mockWhere = vi.mocked(where);
const mockOrderBy = vi.mocked(orderBy);
const mockLimit = vi.mocked(limit);

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue("docRef" as any);
  mockCollection.mockReturnValue("colRef" as any);
  mockQuery.mockReturnValue("q" as any);
  mockWhere.mockReturnValue("w" as any);
  mockOrderBy.mockReturnValue("ob" as any);
  mockLimit.mockReturnValue("l" as any);
  mockSetDoc.mockResolvedValue(undefined as any);
});

describe("getReviews", () => {
  it("returns reviews filtered by supplierId", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "r1", data: () => ({ supplierId: "sup1", overallRating: 4 }) }],
    } as any);

    const result = await getReviews("uid1", "sup1");
    expect(mockWhere).toHaveBeenCalledWith("supplierId", "==", "sup1");
    expect(result).toHaveLength(1);
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("fail"));
    await expect(getReviews("uid1", "sup1")).rejects.toThrow("fail");
  });
});

describe("createReview", () => {
  it("creates review and returns ref id", async () => {
    mockDoc.mockReturnValue({ id: "new-review-id" } as any);
    const result = await createReview("uid1", {
      supplierId: "sup1",
      userId: "uid1",
      userName: "Test",
      overallRating: 5,
      breakdown: { productQuality: 5, shippingSpeed: 4, communication: 5, pricing: 4, reliability: 5 },
      title: "Great",
      body: "Excellent supplier",
      photos: [],
      orderVolume: 10,
      timeWorkingWithSupplier: "6 months",
      verified: false,
      helpful: 0,
      createdAt: "",
    });
    expect(mockSetDoc).toHaveBeenCalled();
    expect(result).toBe("new-review-id");
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(createReview("uid1", {} as any)).rejects.toThrow("write fail");
  });
});

describe("getCommunityScore", () => {
  it("returns community score when exists", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ supplierId: "sup1", totalReviews: 25, avgRating: 4.3 }),
    } as any);

    const result = await getCommunityScore("uid1", "sup1");
    expect(result).toBeDefined();
  });

  it("returns null when not exists", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false } as any);
    const result = await getCommunityScore("uid1", "sup1");
    expect(result).toBeNull();
  });

  it("throws when getDoc fails", async () => {
    mockGetDoc.mockRejectedValue(new Error("fail"));
    await expect(getCommunityScore("uid1", "sup1")).rejects.toThrow("fail");
  });
});

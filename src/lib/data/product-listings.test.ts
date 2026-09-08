import { describe, it, expect, vi, beforeEach } from "vitest";
import { doc, setDoc, deleteDoc, getDocs, collection, query, orderBy, limit, where } from "firebase/firestore";
import { addListing, getListings, deleteListing, getListingStats } from "./product-listings";

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

describe("addListing", () => {
  it("creates doc in productListings collection", async () => {
    const listing = {
      platform: "amazon",
      title: "Test Product",
      description: "Test description",
      bulletPoints: ["Feature 1"],
      seoTags: ["tag1"],
      characterCounts: { title: 12, description: 16 },
      optimizationScore: 80,
      productTitle: "Test Product",
      productPrice: 29.99,
    };
    const id = await addListing("uid1", listing);
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "users", "uid1", "productListings");
    expect(mockSetDoc).toHaveBeenCalled();
    expect(id).toBeDefined();
  });
});

describe("getListings", () => {
  it("fetches listings without platform filter", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    const result = await getListings("uid1");
    expect(result).toEqual([]);
    expect(mockGetDocs).toHaveBeenCalled();
  });

  it("fetches listings with platform filter", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getListings("uid1", "amazon");
    expect(mockWhere).toHaveBeenCalledWith("platform", "==", "amazon");
  });
});

describe("deleteListing", () => {
  it("deletes listing by id", async () => {
    const result = await deleteListing("uid1", "listing-1");
    expect(result).toBe(true);
    expect(mockDeleteDoc).toHaveBeenCalled();
  });
});

describe("getListingStats", () => {
  it("returns stats for empty listings", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    const stats = await getListingStats("uid1");
    expect(stats.totalGenerated).toBe(0);
    expect(stats.avgOptimizationScore).toBe(0);
  });
});

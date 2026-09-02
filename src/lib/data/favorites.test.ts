import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { addFavorite, removeFavorite, getFavorites, isFavorited } from "./favorites";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
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
const mockDeleteDoc = vi.mocked(deleteDoc);
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
  mockDeleteDoc.mockResolvedValue(undefined as any);
});

describe("addFavorite", () => {
  it("creates favorite with composite doc ID", async () => {
    await addFavorite("uid1", "product", "item1", "Test Product");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "favorites", "product_item1");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      type: "product",
      itemId: "item1",
      title: "Test Product",
      addedAt: "mock-ts",
    });
  });

  it("creates favorite for supplier type", async () => {
    await addFavorite("uid1", "supplier", "sup1", "Supplier Name");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "favorites", "supplier_sup1");
  });

  it("creates favorite for niche type", async () => {
    await addFavorite("uid1", "niche", "niche1", "Niche Title");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "favorites", "niche_niche1");
  });

  it("throws on invalid type", async () => {
    await expect(
      addFavorite("uid1", "invalid" as any, "item1", "Title")
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("firestore fail"));
    await expect(
      addFavorite("uid1", "product", "item1", "Test")
    ).rejects.toThrow("firestore fail");
  });
});

describe("removeFavorite", () => {
  it("deletes with composite doc ID", async () => {
    await removeFavorite("uid1", "product", "item1");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "favorites", "product_item1");
    expect(mockDeleteDoc).toHaveBeenCalledWith("docRef");
  });

  it("throws when deleteDoc fails", async () => {
    mockDeleteDoc.mockRejectedValue(new Error("delete fail"));
    await expect(
      removeFavorite("uid1", "product", "item1")
    ).rejects.toThrow("delete fail");
  });
});

describe("getFavorites", () => {
  it("returns favorites filtered by type", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "product_item1",
          data: () => ({
            type: "product",
            itemId: "item1",
            title: "Product 1",
            addedAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getFavorites("uid1", "product");
    expect(mockWhere).toHaveBeenCalledWith("type", "==", "product");
    expect(mockOrderBy).toHaveBeenCalledWith("addedAt", "desc");
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("product_item1");
  });

  it("returns favorites without type filter", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getFavorites("uid1");
    expect(mockWhere).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalled();
  });

  it("uses users/{uid}/favorites collection", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getFavorites("uid1");
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "favorites");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getFavorites("uid1")).rejects.toThrow("query fail");
  });
});

describe("isFavorited", () => {
  it("returns true when document exists", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true } as any);
    const result = await isFavorited("uid1", "product", "item1");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "favorites", "product_item1");
    expect(result).toBe(true);
  });

  it("returns false when document does not exist", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false } as any);
    const result = await isFavorited("uid1", "product", "item1");
    expect(result).toBe(false);
  });

  it("throws when getDoc fails", async () => {
    mockGetDoc.mockRejectedValue(new Error("get fail"));
    await expect(isFavorited("uid1", "product", "item1")).rejects.toThrow("get fail");
  });
});

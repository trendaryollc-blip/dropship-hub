import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
} from "./watchlist";

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
  handleFirestoreError: vi.fn((_ctx: string, err: unknown) => {
    throw err;
  }),
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
  mockDoc.mockReturnValue("docRef" as any);
  mockCollection.mockReturnValue("colRef" as any);
  mockQuery.mockReturnValue("q" as any);
  mockWhere.mockReturnValue("w" as any);
  mockOrderBy.mockReturnValue("ob" as any);
  mockLimit.mockReturnValue("l" as any);
  mockSetDoc.mockResolvedValue(undefined as any);
  mockDeleteDoc.mockResolvedValue(undefined as any);
});

describe("addToWatchlist", () => {
  it("creates with composite doc ID {type}_{itemId}", async () => {
    await addToWatchlist("uid1", {
      type: "product",
      itemId: "item1",
      title: "Test Product",
    });
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "watchlist",
      "product_item1"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      type: "product",
      itemId: "item1",
      title: "Test Product",
      addedAt: "mock-ts",
    });
  });

  it("handles competitor type", async () => {
    await addToWatchlist("uid1", {
      type: "competitor",
      itemId: "comp1",
      title: "Competitor Store",
    });
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "watchlist",
      "competitor_comp1"
    );
  });

  it("includes optional fields", async () => {
    await addToWatchlist("uid1", {
      type: "niche",
      itemId: "n1",
      title: "Niche",
      currentPrice: 29.99,
      targetPrice: 24.99,
      notes: "Watch this",
    });
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      type: "niche",
      itemId: "n1",
      title: "Niche",
      currentPrice: 29.99,
      targetPrice: 24.99,
      notes: "Watch this",
      addedAt: "mock-ts",
    });
  });

  it("throws on invalid type", async () => {
    await expect(
      addToWatchlist("uid1", {
        type: "invalid" as any,
        itemId: "item1",
        title: "Title",
      })
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addToWatchlist("uid1", {
        type: "product",
        itemId: "item1",
        title: "Title",
      })
    ).rejects.toThrow("write fail");
  });
});

describe("removeFromWatchlist", () => {
  it("deletes with composite doc ID", async () => {
    await removeFromWatchlist("uid1", "product", "item1");
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "watchlist",
      "product_item1"
    );
    expect(mockDeleteDoc).toHaveBeenCalledWith("docRef");
  });

  it("throws when deleteDoc fails", async () => {
    mockDeleteDoc.mockRejectedValue(new Error("delete fail"));
    await expect(
      removeFromWatchlist("uid1", "product", "item1")
    ).rejects.toThrow("delete fail");
  });
});

describe("getWatchlist", () => {
  it("returns entries filtered by type", async () => {
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

    const result = await getWatchlist("uid1", "product");
    expect(mockWhere).toHaveBeenCalledWith("type", "==", "product");
    expect(mockOrderBy).toHaveBeenCalledWith("addedAt", "desc");
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("product_item1");
  });

  it("returns all entries without type filter", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getWatchlist("uid1");
    expect(mockWhere).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalled();
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getWatchlist("uid1")).rejects.toThrow("query fail");
  });
});

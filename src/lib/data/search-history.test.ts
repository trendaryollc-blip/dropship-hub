import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import {
  addSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  addCompetitorSearch,
  getCompetitorSearches,
} from "./search-history";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  writeBatch: vi.fn(() => ({
    delete: vi.fn(),
    commit: vi.fn(),
  })),
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
const mockWriteBatch = vi.mocked(writeBatch);

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue("docRef" as any);
  mockCollection.mockReturnValue("colRef" as any);
  mockQuery.mockReturnValue("q" as any);
  mockOrderBy.mockReturnValue("ob" as any);
  mockLimit.mockReturnValue("l" as any);
  mockSetDoc.mockResolvedValue(undefined as any);
});

describe("addSearchHistory", () => {
  it("creates auto-ID doc in searchHistory collection", async () => {
    await addSearchHistory("uid1", {
      query: "wireless headphones",
      source: "amazon",
      resultCount: 42,
    });
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "searchHistory"
    );
    expect(mockDoc).toHaveBeenCalledWith("colRef");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      query: "wireless headphones",
      source: "amazon",
      resultCount: 42,
      createdAt: "mock-ts",
    });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addSearchHistory("uid1", {
        query: "test",
        source: "test",
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getSearchHistory", () => {
  it("returns entries with default limit 20", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "sh1",
          data: () => ({
            query: "test query",
            source: "amazon",
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getSearchHistory("uid1");
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("sh1");
  });

  it("respects custom limit", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getSearchHistory("uid1", 50);
    expect(mockLimit).toHaveBeenCalledWith(50);
  });

  it("orders by createdAt desc", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getSearchHistory("uid1");
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getSearchHistory("uid1")).rejects.toThrow("query fail");
  });
});

describe("clearSearchHistory", () => {
  it("batch-deletes all entries", async () => {
    const batchMock = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    mockWriteBatch.mockReturnValue(batchMock as any);

    mockGetDocs
      .mockResolvedValueOnce({
        docs: [{ ref: "ref0" }, { ref: "ref1" }],
        empty: false,
      } as any)
      .mockResolvedValueOnce({ docs: [], empty: true } as any);

    await clearSearchHistory("uid1");

    expect(mockWriteBatch).toHaveBeenCalled();
    expect(batchMock.delete).toHaveBeenCalledTimes(2);
    expect(batchMock.commit).toHaveBeenCalled();
  });

  it("does nothing when no entries exist", async () => {
    mockGetDocs.mockResolvedValue({ docs: [], empty: true } as any);
    await clearSearchHistory("uid1");
    expect(mockWriteBatch).not.toHaveBeenCalled();
  });

  it("paginates through multiple batches", async () => {
    const batchMock = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    mockWriteBatch.mockReturnValue(batchMock as any);

    const docs50 = Array.from({ length: 50 }, (_, i) => ({
      ref: `ref${i}`,
    }));

    mockGetDocs
      .mockResolvedValueOnce({ docs: docs50, empty: false } as any)
      .mockResolvedValueOnce({
        docs: [{ ref: "ref50" }],
        empty: false,
      } as any)
      .mockResolvedValueOnce({ docs: [], empty: true } as any);

    await clearSearchHistory("uid1");

    expect(batchMock.commit).toHaveBeenCalledTimes(2);
  });

  it("throws when batch commit fails", async () => {
    const batchMock = {
      delete: vi.fn(),
      commit: vi.fn().mockRejectedValue(new Error("batch fail")),
    };
    mockWriteBatch.mockReturnValue(batchMock as any);

    mockGetDocs.mockResolvedValue({
      docs: [{ ref: "ref0" }],
      empty: false,
    } as any);

    await expect(clearSearchHistory("uid1")).rejects.toThrow("batch fail");
  });
});

describe("addCompetitorSearch", () => {
  it("creates auto-ID doc in competitorSearches collection", async () => {
    await addCompetitorSearch("uid1", {
      query: "wireless earbuds",
      platformsFound: 5,
      totalListings: 200,
      avgPrice: 29.99,
    });
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "competitorSearches"
    );
    expect(mockDoc).toHaveBeenCalledWith("colRef");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      query: "wireless earbuds",
      platformsFound: 5,
      totalListings: 200,
      avgPrice: 29.99,
      createdAt: "mock-ts",
    });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addCompetitorSearch("uid1", {
        query: "test",
        platformsFound: 1,
        totalListings: 10,
        avgPrice: 9.99,
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getCompetitorSearches", () => {
  it("returns entries with default limit 20", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "cs1",
          data: () => ({
            query: "test",
            platformsFound: 3,
            totalListings: 100,
            avgPrice: 19.99,
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getCompetitorSearches("uid1");
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("cs1");
  });

  it("respects custom limit", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getCompetitorSearches("uid1", 10);
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getCompetitorSearches("uid1")).rejects.toThrow("query fail");
  });
});

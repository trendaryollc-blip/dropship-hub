import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { saveCalcHistory, getCalcHistory } from "./calc-history";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
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

describe("saveCalcHistory", () => {
  it("creates auto-ID doc with correct collection path", async () => {
    await saveCalcHistory("uid1", {
      type: "profit",
      inputs: { revenue: 100 },
      result: { profit: 50 },
    });
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "calcHistory");
    expect(mockDoc).toHaveBeenCalledWith("colRef");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      type: "profit",
      inputs: { revenue: 100 },
      result: { profit: 50 },
      savedAt: "mock-ts",
    });
  });

  it("throws on invalid type", async () => {
    await expect(
      saveCalcHistory("uid1", {
        type: "invalid" as any,
        inputs: {},
        result: {},
      })
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      saveCalcHistory("uid1", {
        type: "shipping",
        inputs: { cost: 10 },
        result: { total: 15 },
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getCalcHistory", () => {
  it("returns entries filtered by type", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "doc1",
          data: () => ({
            type: "profit",
            inputs: { a: 1 },
            result: { b: 2 },
            savedAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getCalcHistory("uid1", "profit");
    expect(mockWhere).toHaveBeenCalledWith("type", "==", "profit");
    expect(mockOrderBy).toHaveBeenCalledWith("savedAt", "desc");
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("doc1");
  });

  it("returns all entries without type filter", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getCalcHistory("uid1");
    expect(mockWhere).not.toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalledWith(20);
  });

  it("uses correct collection path", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getCalcHistory("uid1");
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "calcHistory");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getCalcHistory("uid1")).rejects.toThrow("query fail");
  });
});

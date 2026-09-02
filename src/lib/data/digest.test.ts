import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  saveDigest,
  getDigests,
  getLatestDigest,
  deleteDigest,
} from "./digest";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
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
const mockDeleteDoc = vi.mocked(deleteDoc);
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
  mockDeleteDoc.mockResolvedValue(undefined as any);
});

const validDigest = {
  date: "2025-01-15",
  summary: "Daily summary of operations",
  metrics: {
    orders: 15,
    revenue: 1500,
    profit: 450,
    stockAlerts: 2,
    supplierDelays: 1,
  },
  alerts: [
    {
      type: "stock" as const,
      title: "Low Stock",
      description: "Product X is running low",
      severity: "medium" as const,
    },
  ],
  recommendations: ["Increase ad spend for Product X"],
};

describe("saveDigest", () => {
  it("creates auto-ID doc in digests collection", async () => {
    await saveDigest("uid1", validDigest);
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "digests");
    expect(mockDoc).toHaveBeenCalledWith("colRef");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...validDigest,
      generatedAt: "mock-ts",
    });
  });

  it("includes weeklyTrend when provided", async () => {
    const digestWithTrend = {
      ...validDigest,
      weeklyTrend: {
        direction: "up" as const,
        percentage: 12.5,
        insight: "Revenue trending upward",
      },
    };
    await saveDigest("uid1", digestWithTrend);
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...digestWithTrend,
      generatedAt: "mock-ts",
    });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(saveDigest("uid1", validDigest)).rejects.toThrow("write fail");
  });
});

describe("getDigests", () => {
  it("returns digests with default limit 7", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "d1",
          data: () => ({
            ...validDigest,
            generatedAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getDigests("uid1");
    expect(mockLimit).toHaveBeenCalledWith(7);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("d1");
  });

  it("respects custom limit", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getDigests("uid1", 14);
    expect(mockLimit).toHaveBeenCalledWith(14);
  });

  it("orders by generatedAt desc", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getDigests("uid1");
    expect(mockOrderBy).toHaveBeenCalledWith("generatedAt", "desc");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getDigests("uid1")).rejects.toThrow("query fail");
  });
});

describe("getLatestDigest", () => {
  it("returns the first digest when available", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "d1",
          data: () => ({
            ...validDigest,
            generatedAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getLatestDigest("uid1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("d1");
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it("returns null when no digests exist", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    const result = await getLatestDigest("uid1");
    expect(result).toBeNull();
  });
});

describe("deleteDigest", () => {
  it("deletes doc by digest ID", async () => {
    await deleteDigest("uid1", "digest1");
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "digests",
      "digest1"
    );
    expect(mockDeleteDoc).toHaveBeenCalledWith("docRef");
  });

  it("throws when deleteDoc fails", async () => {
    mockDeleteDoc.mockRejectedValue(new Error("delete fail"));
    await expect(deleteDigest("uid1", "digest1")).rejects.toThrow("delete fail");
  });
});

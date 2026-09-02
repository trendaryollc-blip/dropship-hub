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
import { addRevenueEntry, getRevenueEntries, deleteRevenueEntry } from "./revenue";

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

describe("addRevenueEntry", () => {
  it("creates auto-ID doc with correct collection path", async () => {
    await addRevenueEntry("uid1", {
      date: "2025-01-01",
      amount: 500,
      orders: 10,
    });
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "revenue");
    expect(mockDoc).toHaveBeenCalledWith("colRef");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      date: "2025-01-01",
      amount: 500,
      orders: 10,
      createdAt: "mock-ts",
    });
  });

  it("includes optional fields", async () => {
    await addRevenueEntry("uid1", {
      date: "2025-01-01",
      amount: 500,
      orders: 10,
      productTitle: "Widget",
      platform: "Shopify",
      profit: 200,
    });
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      date: "2025-01-01",
      amount: 500,
      orders: 10,
      productTitle: "Widget",
      platform: "Shopify",
      profit: 200,
      createdAt: "mock-ts",
    });
  });

  it("throws on negative amount", async () => {
    await expect(
      addRevenueEntry("uid1", {
        date: "2025-01-01",
        amount: -1,
        orders: 10,
      })
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addRevenueEntry("uid1", { date: "2025-01-01", amount: 100, orders: 1 })
    ).rejects.toThrow("write fail");
  });
});

describe("getRevenueEntries", () => {
  it("returns entries with default limit 30", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "r1",
          data: () => ({
            date: "2025-01-01",
            amount: 500,
            orders: 10,
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getRevenueEntries("uid1");
    expect(mockLimit).toHaveBeenCalledWith(30);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("r1");
  });

  it("respects custom limit", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getRevenueEntries("uid1", 10);
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it("orders by createdAt desc", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getRevenueEntries("uid1");
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getRevenueEntries("uid1")).rejects.toThrow("query fail");
  });
});

describe("deleteRevenueEntry", () => {
  it("deletes doc by entry ID", async () => {
    await deleteRevenueEntry("uid1", "entry1");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "revenue", "entry1");
    expect(mockDeleteDoc).toHaveBeenCalledWith("docRef");
  });

  it("throws when deleteDoc fails", async () => {
    mockDeleteDoc.mockRejectedValue(new Error("delete fail"));
    await expect(deleteRevenueEntry("uid1", "entry1")).rejects.toThrow("delete fail");
  });
});

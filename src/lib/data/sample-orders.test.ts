import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  getSampleOrders,
  createSampleOrder,
  updateSampleOrder,
  getQualityScore,
} from "./sample-orders";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
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
const mockGetDoc = vi.mocked(getDoc);
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

describe("getSampleOrders", () => {
  it("returns sample orders", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "s1", data: () => ({ productName: "Test" }) }],
    } as any);

    const result = await getSampleOrders("uid1");
    expect(result).toHaveLength(1);
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("fail"));
    await expect(getSampleOrders("uid1")).rejects.toThrow("fail");
  });
});

describe("createSampleOrder", () => {
  it("creates order and returns ref id", async () => {
    mockDoc.mockReturnValue({ id: "new-order-id" } as any);
    const result = await createSampleOrder("uid1", {
      userId: "uid1",
      supplierId: "sup1",
      supplierName: "Test",
      productName: "Product",
      productImageUrl: "",
      samplePrice: 10,
      status: "requested",
      orderedAt: "",
      wouldOrder: false,
    });
    expect(mockSetDoc).toHaveBeenCalled();
    expect(result).toBe("new-order-id");
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(createSampleOrder("uid1", {} as any)).rejects.toThrow("write fail");
  });
});

describe("updateSampleOrder", () => {
  it("updates order with merge", async () => {
    await updateSampleOrder("uid1", "order1", { status: "shipped" });
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", { status: "shipped" }, { merge: true });
  });
});

describe("getQualityScore", () => {
  it("returns quality score when exists", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ supplierId: "sup1", avgQualityRating: 4.5 }),
    } as any);

    const result = await getQualityScore("uid1", "sup1");
    expect(result).toBeDefined();
  });

  it("returns null when not exists", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false } as any);
    const result = await getQualityScore("uid1", "sup1");
    expect(result).toBeNull();
  });
});

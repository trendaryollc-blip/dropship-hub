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
  addCostProfile,
  getCostProfiles,
  deleteCostProfile,
  addProfitEntry,
  getProfitEntries,
} from "./profit";

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

const validCostProfile = {
  productId: "prod1",
  productTitle: "Widget",
  cogs: 5.0,
  shippingCost: 2.5,
  platformFeePercent: 15,
  paymentProcessingPercent: 2.9,
  packagingCost: 0.5,
  otherCosts: 0.0,
};

describe("addCostProfile", () => {
  it("creates auto-ID doc in costProfiles collection", async () => {
    await addCostProfile("uid1", validCostProfile);
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "costProfiles");
    expect(mockDoc).toHaveBeenCalledWith("colRef");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...validCostProfile,
      createdAt: "mock-ts",
    });
  });

  it("throws on negative cogs", async () => {
    await expect(
      addCostProfile("uid1", { ...validCostProfile, cogs: -1 })
    ).rejects.toThrow();
  });

  it("throws on platformFeePercent > 100", async () => {
    await expect(
      addCostProfile("uid1", { ...validCostProfile, platformFeePercent: 150 })
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(addCostProfile("uid1", validCostProfile)).rejects.toThrow(
      "write fail"
    );
  });
});

describe("getCostProfiles", () => {
  it("returns cost profiles with limit 50", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "cp1",
          data: () => ({
            ...validCostProfile,
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getCostProfiles("uid1");
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("cp1");
  });

  it("orders by createdAt desc", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getCostProfiles("uid1");
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getCostProfiles("uid1")).rejects.toThrow("query fail");
  });
});

describe("deleteCostProfile", () => {
  it("deletes doc by profile ID", async () => {
    await deleteCostProfile("uid1", "cp1");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "costProfiles", "cp1");
    expect(mockDeleteDoc).toHaveBeenCalledWith("docRef");
  });

  it("throws when deleteDoc fails", async () => {
    mockDeleteDoc.mockRejectedValue(new Error("delete fail"));
    await expect(deleteCostProfile("uid1", "cp1")).rejects.toThrow("delete fail");
  });
});

const validProfitEntry = {
  orderId: "ord1",
  date: "2025-01-15",
  productTitle: "Widget",
  platform: "Shopify",
  revenue: 49.99,
  cogs: 10.0,
  shippingCost: 5.0,
  platformFee: 7.5,
  paymentProcessing: 1.45,
  refunds: 0,
  adSpend: 3.0,
  netProfit: 23.04,
  profitMargin: 46.1,
};

describe("addProfitEntry", () => {
  it("creates auto-ID doc in profitEntries collection", async () => {
    await addProfitEntry("uid1", validProfitEntry);
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "profitEntries"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...validProfitEntry,
      createdAt: "mock-ts",
    });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(addProfitEntry("uid1", validProfitEntry)).rejects.toThrow(
      "write fail"
    );
  });
});

describe("getProfitEntries", () => {
  it("returns entries with default limit 50", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "pe1",
          data: () => ({
            ...validProfitEntry,
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getProfitEntries("uid1");
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toHaveLength(1);
  });

  it("respects custom limit", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getProfitEntries("uid1", 10);
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it("orders by createdAt desc", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getProfitEntries("uid1");
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getProfitEntries("uid1")).rejects.toThrow("query fail");
  });
});

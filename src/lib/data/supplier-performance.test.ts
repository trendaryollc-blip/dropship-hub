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
import {
  addSupplierPerformance,
  getSupplierPerformanceHistory,
  addSupplierAlert,
  getSupplierAlerts,
} from "./supplier-performance";

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

describe("addSupplierPerformance", () => {
  it("creates auto-ID doc in supplierPerformance collection", async () => {
    const entry = {
      supplierId: "sup1",
      supplierName: "CJ Dropshipping",
      reliabilityScore: 92,
      refundRate: 2.1,
      avgShippingDays: 7,
      complaintRate: 1.5,
      stockReliability: 95,
      snapshotDate: "2025-01-15",
    };
    await addSupplierPerformance("uid1", entry);
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "supplierPerformance"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...entry,
      createdAt: "mock-ts",
    });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addSupplierPerformance("uid1", {
        supplierId: "sup1",
        supplierName: "Test",
        reliabilityScore: 90,
        refundRate: 1,
        avgShippingDays: 5,
        complaintRate: 1,
        stockReliability: 95,
        snapshotDate: "2025-01-15",
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getSupplierPerformanceHistory", () => {
  it("returns history filtered by supplierId", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "sp1",
          data: () => ({
            supplierId: "sup1",
            supplierName: "CJ",
            reliabilityScore: 92,
            refundRate: 2.1,
            avgShippingDays: 7,
            complaintRate: 1.5,
            stockReliability: 95,
            snapshotDate: "2025-01-15",
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getSupplierPerformanceHistory("uid1", "sup1");
    expect(mockWhere).toHaveBeenCalledWith("supplierId", "==", "sup1");
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(mockLimit).toHaveBeenCalledWith(30);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("sp1");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(
      getSupplierPerformanceHistory("uid1", "sup1")
    ).rejects.toThrow("query fail");
  });
});

describe("addSupplierAlert", () => {
  it("creates auto-ID doc in supplierAlerts collection", async () => {
    const alert = {
      supplierId: "sup1",
      supplierName: "CJ",
      type: "delay",
      severity: "high" as const,
      title: "Shipping Delay",
      description: "Supplier delayed 5 orders",
      read: false,
    };
    await addSupplierAlert("uid1", alert);
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "supplierAlerts"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...alert,
      createdAt: "mock-ts",
    });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addSupplierAlert("uid1", {
        supplierId: "sup1",
        supplierName: "CJ",
        type: "delay",
        severity: "high",
        title: "Delay",
        description: "Desc",
        read: false,
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getSupplierAlerts", () => {
  it("returns alerts with limit 20", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "sa1",
          data: () => ({
            supplierId: "sup1",
            supplierName: "CJ",
            type: "delay",
            severity: "high",
            title: "Delay",
            description: "Desc",
            read: false,
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getSupplierAlerts("uid1");
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("sa1");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getSupplierAlerts("uid1")).rejects.toThrow("query fail");
  });
});

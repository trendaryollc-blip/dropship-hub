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
  getHealthSnapshot,
  saveHealthSnapshot,
  getHealthAlerts,
  saveHealthAlert,
} from "./supplier-health";

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

describe("getHealthSnapshot", () => {
  it("returns snapshot when doc exists", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ supplierId: "sup1", overallHealth: 85, createdAt: "ts" }),
    } as any);

    const result = await getHealthSnapshot("uid1", "sup1");
    expect(mockDoc).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result!.supplierId).toBe("sup1");
  });

  it("returns null when doc does not exist", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false } as any);
    const result = await getHealthSnapshot("uid1", "sup1");
    expect(result).toBeNull();
  });

  it("throws when getDoc fails", async () => {
    mockGetDoc.mockRejectedValue(new Error("read fail"));
    await expect(getHealthSnapshot("uid1", "sup1")).rejects.toThrow("read fail");
  });
});

describe("saveHealthSnapshot", () => {
  it("saves snapshot with merge", async () => {
    const data = { supplierId: "sup1", overallHealth: 85, metrics: {}, healthTrend: "stable" as const, prediction: null, timestamp: "" };
    await saveHealthSnapshot("uid1", "sup1", data);
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", expect.objectContaining({ supplierId: "sup1", createdAt: "mock-ts" }), { merge: true });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(saveHealthSnapshot("uid1", "sup1", {} as any)).rejects.toThrow("write fail");
  });
});

describe("getHealthAlerts", () => {
  it("returns alerts with limit 20", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "a1", data: () => ({ type: "stock_low", severity: "warning" }) }],
    } as any);

    const result = await getHealthAlerts("uid1");
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("a1");
  });

  it("returns empty array on failure", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getHealthAlerts("uid1")).rejects.toThrow("query fail");
  });
});

describe("saveHealthAlert", () => {
  it("creates auto-ID doc in supplierHealthAlerts", async () => {
    const alert = {
      supplierId: "sup1",
      type: "stock_low" as const,
      severity: "warning" as const,
      message: "Low stock",
      metric: "stockLevel",
      currentValue: 10,
      previousValue: 50,
      changePercent: 80,
      recommendation: "Restock soon",
      createdAt: "",
      acknowledged: false,
    };
    await saveHealthAlert("uid1", alert);
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "supplierHealthAlerts");
    expect(mockSetDoc).toHaveBeenCalled();
  });
});

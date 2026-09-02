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
  addProductLifecycle,
  getProductLifecycles,
  addLifecycleSnapshot,
  getLifecycleSnapshots,
  addLifecycleAlert,
  getLifecycleAlerts,
} from "./product-lifecycle";

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

describe("addProductLifecycle", () => {
  it("creates auto-ID doc in productLifecycle collection", async () => {
    const entry = {
      productId: "p1",
      productTitle: "Widget",
      currentStage: "growing",
      stageEnteredAt: "2025-01-10",
      totalDaysTracked: 30,
    };
    await addProductLifecycle("uid1", entry);
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "productLifecycle"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...entry,
      createdAt: "mock-ts",
    });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addProductLifecycle("uid1", {
        productId: "p1",
        productTitle: "Widget",
        currentStage: "growing",
        stageEnteredAt: "2025-01-10",
        totalDaysTracked: 30,
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getProductLifecycles", () => {
  it("returns lifecycles ordered by createdAt desc, limit 50", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "pl1",
          data: () => ({
            productId: "p1",
            productTitle: "Widget",
            currentStage: "growing",
            stageEnteredAt: "2025-01-10",
            totalDaysTracked: 30,
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getProductLifecycles("uid1");
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("pl1");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getProductLifecycles("uid1")).rejects.toThrow("query fail");
  });
});

describe("addLifecycleSnapshot", () => {
  it("creates auto-ID doc in lifecycleSnapshots collection", async () => {
    const snapshot = {
      productId: "p1",
      date: "2025-01-15",
      stage: "growing",
      orders: 25,
      revenue: 750,
      profit: 225,
      competitionCount: 12,
      searchVolume: 5000,
    };
    await addLifecycleSnapshot("uid1", snapshot);
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "lifecycleSnapshots"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...snapshot,
      createdAt: "mock-ts",
    });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addLifecycleSnapshot("uid1", {
        productId: "p1",
        date: "2025-01-15",
        stage: "growing",
        orders: 25,
        revenue: 750,
        profit: 225,
        competitionCount: 12,
        searchVolume: 5000,
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getLifecycleSnapshots", () => {
  it("returns snapshots filtered by productId, limit 90", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "ls1",
          data: () => ({
            productId: "p1",
            date: "2025-01-15",
            stage: "growing",
            orders: 25,
            revenue: 750,
            profit: 225,
            competitionCount: 12,
            searchVolume: 5000,
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getLifecycleSnapshots("uid1", "p1");
    expect(mockWhere).toHaveBeenCalledWith("productId", "==", "p1");
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(mockLimit).toHaveBeenCalledWith(90);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("ls1");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getLifecycleSnapshots("uid1", "p1")).rejects.toThrow(
      "query fail"
    );
  });
});

describe("addLifecycleAlert", () => {
  it("creates auto-ID doc in lifecycleAlerts collection", async () => {
    const alert = {
      productId: "p1",
      productTitle: "Widget",
      type: "competition_spike",
      severity: "warning" as const,
      title: "Competition Rising",
      description: "10 new competitors detected",
      read: false,
    };
    await addLifecycleAlert("uid1", alert);
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "lifecycleAlerts"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...alert,
      createdAt: "mock-ts",
    });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addLifecycleAlert("uid1", {
        productId: "p1",
        productTitle: "Widget",
        type: "test",
        severity: "info",
        title: "Title",
        description: "Desc",
        read: false,
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getLifecycleAlerts", () => {
  it("returns alerts with limit 20", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "la1",
          data: () => ({
            productId: "p1",
            productTitle: "Widget",
            type: "competition_spike",
            severity: "warning",
            title: "Competition Rising",
            description: "Desc",
            read: false,
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getLifecycleAlerts("uid1");
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("la1");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getLifecycleAlerts("uid1")).rejects.toThrow("query fail");
  });
});

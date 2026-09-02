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
  addRoutingDecision,
  getRoutingDecisions,
  saveRoutingPreferences,
  getRoutingPreferences,
} from "./order-routing";

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

describe("addRoutingDecision", () => {
  it("creates auto-ID doc in routingDecisions collection", async () => {
    const decision = {
      orderId: "ord1",
      customerLocation: "New York, US",
      productTitle: "Widget",
      selectedSupplier: "CJ Dropshipping",
      shippingDays: 7,
      shippingCost: 5.0,
      totalCost: 15.0,
      reasoning: "Fastest shipping option",
      status: "routed",
      routedAt: "2025-01-15T10:00:00Z",
    };
    await addRoutingDecision("uid1", decision);
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "routingDecisions"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...decision,
      createdAt: "mock-ts",
    });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addRoutingDecision("uid1", {
        orderId: "ord1",
        customerLocation: "NY",
        productTitle: "Widget",
        selectedSupplier: "CJ",
        shippingDays: 7,
        shippingCost: 5,
        totalCost: 15,
        reasoning: "Best option",
        status: "routed",
        routedAt: "2025-01-15",
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getRoutingDecisions", () => {
  it("returns decisions with default limit 30", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "rd1",
          data: () => ({
            orderId: "ord1",
            customerLocation: "NY",
            productTitle: "Widget",
            selectedSupplier: "CJ",
            shippingDays: 7,
            shippingCost: 5,
            totalCost: 15,
            reasoning: "Best option",
            status: "routed",
            routedAt: "2025-01-15",
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getRoutingDecisions("uid1");
    expect(mockLimit).toHaveBeenCalledWith(30);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("rd1");
  });

  it("respects custom limit", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getRoutingDecisions("uid1", 10);
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getRoutingDecisions("uid1")).rejects.toThrow("query fail");
  });
});

describe("saveRoutingPreferences", () => {
  it("upserts singleton doc 'default'", async () => {
    const prefs = {
      optimization: "balanced" as const,
      maxShippingDays: 15,
      minQualityScore: 80,
      preferLocalWarehouse: true,
      autoFallback: true,
    };
    await saveRoutingPreferences("uid1", prefs);
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "routingPreferences",
      "default"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...prefs,
      createdAt: "mock-ts",
    });
  });

  it("uses speed optimization", async () => {
    await saveRoutingPreferences("uid1", {
      optimization: "speed",
      maxShippingDays: 5,
      minQualityScore: 90,
      preferLocalWarehouse: false,
      autoFallback: true,
    });
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "routingPreferences",
      "default"
    );
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      saveRoutingPreferences("uid1", {
        optimization: "cost",
        maxShippingDays: 30,
        minQualityScore: 70,
        preferLocalWarehouse: false,
        autoFallback: false,
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getRoutingPreferences", () => {
  it("returns preferences when doc exists", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: "default",
      data: () => ({
        optimization: "balanced",
        maxShippingDays: 15,
        minQualityScore: 80,
        preferLocalWarehouse: true,
        autoFallback: true,
        createdAt: "ts",
      }),
    } as any);

    const result = await getRoutingPreferences("uid1");
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "routingPreferences",
      "default"
    );
    expect(result).not.toBeNull();
    expect(result!.optimization).toBe("balanced");
  });

  it("returns null when doc does not exist", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false } as any);
    const result = await getRoutingPreferences("uid1");
    expect(result).toBeNull();
  });

  it("throws when getDoc fails", async () => {
    mockGetDoc.mockRejectedValue(new Error("get fail"));
    await expect(getRoutingPreferences("uid1")).rejects.toThrow("get fail");
  });
});

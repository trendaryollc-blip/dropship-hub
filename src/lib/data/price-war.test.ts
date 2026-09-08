import { describe, it, expect, vi, beforeEach } from "vitest";
import { doc, setDoc, deleteDoc, getDocs, collection, query, orderBy, limit, where, updateDoc } from "firebase/firestore";
import { addPriceRule, getPriceRules, updatePriceRule, deletePriceRule, addPriceAdjustmentLog, getPriceAdjustmentLogs, getPriceWarStats } from "./price-war";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "mock-ts"),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("./utils", () => ({
  handleFirestoreError: vi.fn((_ctx: string, err: unknown) => { throw err; }),
}));

const mockDoc = vi.mocked(doc);
const mockSetDoc = vi.mocked(setDoc);
const mockDeleteDoc = vi.mocked(deleteDoc);
const mockGetDocs = vi.mocked(getDocs);
const mockUpdateDoc = vi.mocked(updateDoc);
const mockCollection = vi.mocked(collection);
const mockQuery = vi.mocked(query);
const mockWhere = vi.mocked(where);
const mockOrderBy = vi.mocked(orderBy);
const mockLimit = vi.mocked(limit);

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue({ id: "mock-id" } as any);
  mockCollection.mockReturnValue("colRef" as any);
  mockQuery.mockReturnValue("q" as any);
  mockWhere.mockReturnValue("w" as any);
  mockOrderBy.mockReturnValue("ob" as any);
  mockLimit.mockReturnValue("l" as any);
  mockSetDoc.mockResolvedValue(undefined as any);
  mockDeleteDoc.mockResolvedValue(undefined as any);
  mockUpdateDoc.mockResolvedValue(undefined as any);
});

describe("addPriceRule", () => {
  it("creates doc in priceRules collection", async () => {
    const rule = {
      productTitle: "Test",
      myPrice: 49.99,
      cost: 15,
      floorPrice: 20,
      minMargin: 20,
      strategy: "match_lowest",
      strategyConfig: {},
      platforms: ["amazon"],
      competitorUrls: ["https://example.com"],
      status: "active",
    };
    const id = await addPriceRule("uid1", rule);
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "users", "uid1", "priceRules");
    expect(id).toBeDefined();
  });
});

describe("getPriceRules", () => {
  it("fetches rules without status filter", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    const result = await getPriceRules("uid1");
    expect(result).toEqual([]);
  });

  it("fetches rules with status filter", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getPriceRules("uid1", "active");
    expect(mockWhere).toHaveBeenCalledWith("status", "==", "active");
  });
});

describe("updatePriceRule", () => {
  it("updates rule document", async () => {
    const result = await updatePriceRule("uid1", "rule-1", { myPrice: 39.99 });
    expect(result).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalled();
  });
});

describe("deletePriceRule", () => {
  it("deletes rule by id", async () => {
    const result = await deletePriceRule("uid1", "rule-1");
    expect(result).toBe(true);
  });
});

describe("addPriceAdjustmentLog", () => {
  it("creates log entry", async () => {
    const log = {
      ruleId: "rule-1",
      productTitle: "Test",
      previousPrice: 49.99,
      newPrice: 45.99,
      reason: "Matching lowest",
      strategy: "match_lowest",
      marginBefore: 70,
      marginAfter: 67,
      autoApplied: true,
    };
    const id = await addPriceAdjustmentLog("uid1", log);
    expect(id).toBeDefined();
  });
});

describe("getPriceWarStats", () => {
  it("returns stats for empty data", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    const stats = await getPriceWarStats("uid1");
    expect(stats.totalRules).toBe(0);
    expect(stats.activeRules).toBe(0);
  });
});

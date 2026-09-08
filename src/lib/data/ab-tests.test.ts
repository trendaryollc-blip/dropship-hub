import { describe, it, expect, vi, beforeEach } from "vitest";
import { doc, setDoc, updateDoc, getDocs, collection, query, orderBy, limit, where, serverTimestamp } from "firebase/firestore";
import { addABTest, getABTests, getABTestsByStatus, getABTestsByCampaign, updateABTest } from "./ab-tests";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => "mock-ts"),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("./utils", () => ({
  handleFirestoreError: vi.fn((_ctx: string, err: unknown) => { throw err; }),
}));

const mockDoc = vi.mocked(doc);
const mockSetDoc = vi.mocked(setDoc);
const mockUpdateDoc = vi.mocked(updateDoc);
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
  mockUpdateDoc.mockResolvedValue(undefined as any);
});

const validTest = {
  campaignId: "camp1",
  name: "Headline Test",
  status: "running" as const,
  creativeAId: "crA",
  creativeBId: "crB",
  splitPercent: 50,
  startDate: "2025-01-01",
};

describe("addABTest", () => {
  it("creates auto-ID doc with correct collection path", async () => {
    await addABTest("uid1", validTest);
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "abTests");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", expect.objectContaining({
      campaignId: "camp1",
      name: "Headline Test",
      status: "running",
      creativeAId: "crA",
      creativeBId: "crB",
      splitPercent: 50,
      startDate: "2025-01-01",
    }));
  });

  it("throws on invalid split percent", async () => {
    await expect(addABTest("uid1", { ...validTest, splitPercent: 150 })).rejects.toThrow();
  });
});

describe("getABTests", () => {
  it("returns tests with default limit 50", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "t1", data: () => ({ ...validTest, createdAt: "ts", updatedAt: "ts" }) }],
    } as any);
    const result = await getABTests("uid1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t1");
  });
});

describe("getABTestsByStatus", () => {
  it("queries with where clause for status", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getABTestsByStatus("uid1", "running");
    expect(mockQuery).toHaveBeenCalled();
  });
});

describe("getABTestsByCampaign", () => {
  it("queries with where clause for campaignId", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getABTestsByCampaign("uid1", "camp1");
    expect(mockQuery).toHaveBeenCalled();
  });
});

describe("updateABTest", () => {
  it("calls updateDoc with updates and updatedAt", async () => {
    await updateABTest("uid1", "entry1", { status: "completed", winnerId: "crA" });
    expect(mockUpdateDoc).toHaveBeenCalledWith("docRef", {
      status: "completed",
      winnerId: "crA",
      updatedAt: "mock-ts",
    });
  });
});

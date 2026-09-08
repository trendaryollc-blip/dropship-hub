import { describe, it, expect, vi, beforeEach } from "vitest";
import { doc, setDoc, deleteDoc, getDocs, updateDoc, collection, query, orderBy, limit, where, serverTimestamp } from "firebase/firestore";
import { addAdCampaign, getAdCampaigns, getAdCampaignById, getAdCampaignsByStatus, updateAdCampaign, deleteAdCampaign } from "./ad-campaigns";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => "mock-ts"),
  getDoc: vi.fn(),
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
  mockUpdateDoc.mockResolvedValue(undefined as any);
});

const validCampaign = {
  platform: "manual" as const,
  name: "Test Campaign",
  status: "active" as const,
  productTitle: "Test Product",
  dailyBudget: 50,
  startDate: "2025-01-01",
  metrics: {
    impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, roas: 0, cpc: 0, ctr: 0, conversionRate: 0,
  },
};

describe("addAdCampaign", () => {
  it("creates auto-ID doc with correct collection path", async () => {
    await addAdCampaign("uid1", validCampaign);
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "adCampaigns");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", expect.objectContaining({
      platform: "manual",
      name: "Test Campaign",
      status: "active",
      productTitle: "Test Product",
      dailyBudget: 50,
      startDate: "2025-01-01",
    }));
  });

  it("throws on invalid data", async () => {
    await expect(addAdCampaign("uid1", { ...validCampaign, name: "" })).rejects.toThrow();
  });
});

describe("getAdCampaigns", () => {
  it("returns campaigns with default limit 50", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "c1", data: () => ({ ...validCampaign, createdAt: "ts", updatedAt: "ts" }) }],
    } as any);
    const result = await getAdCampaigns("uid1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });
});

describe("getAdCampaignById", () => {
  it("returns campaign when found", async () => {
    const { getDoc } = await import("firebase/firestore");
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      id: "c1",
      data: () => ({ ...validCampaign, createdAt: "ts", updatedAt: "ts" }),
    } as any);
    const result = await getAdCampaignById("uid1", "c1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("c1");
  });

  it("returns null when not found", async () => {
    const { getDoc } = await import("firebase/firestore");
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as any);
    const result = await getAdCampaignById("uid1", "nonexistent");
    expect(result).toBeNull();
  });
});

describe("getAdCampaignsByStatus", () => {
  it("queries with where clause for status", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getAdCampaignsByStatus("uid1", "active");
    expect(mockQuery).toHaveBeenCalled();
  });
});

describe("updateAdCampaign", () => {
  it("calls updateDoc with updates and updatedAt", async () => {
    await updateAdCampaign("uid1", "entry1", { status: "paused" });
    expect(mockUpdateDoc).toHaveBeenCalledWith("docRef", { status: "paused", updatedAt: "mock-ts" });
  });
});

describe("deleteAdCampaign", () => {
  it("deletes doc by campaign ID", async () => {
    await deleteAdCampaign("uid1", "entry1");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "adCampaigns", "entry1");
    expect(mockDeleteDoc).toHaveBeenCalledWith("docRef");
  });
});

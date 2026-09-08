import { describe, it, expect, vi, beforeEach } from "vitest";
import { doc, setDoc, deleteDoc, getDocs, collection, query, orderBy, limit, where, serverTimestamp } from "firebase/firestore";
import { addAdCreative, getAdCreatives, getAdCreativesByCampaign, getAdCreativeById, deleteAdCreative } from "./ad-creatives";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
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

const validCreative = {
  campaignId: "camp1",
  platform: "facebook" as const,
  type: "headline" as const,
  content: "Best Product Ever - Buy Now!",
  aiProvider: "openai",
};

describe("addAdCreative", () => {
  it("creates auto-ID doc with correct collection path", async () => {
    await addAdCreative("uid1", validCreative);
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "adCreatives");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", expect.objectContaining({
      campaignId: "camp1",
      platform: "facebook",
      type: "headline",
      content: "Best Product Ever - Buy Now!",
      aiProvider: "openai",
    }));
  });

  it("throws on invalid type", async () => {
    await expect(addAdCreative("uid1", { ...validCreative, type: "video" as any })).rejects.toThrow();
  });
});

describe("getAdCreatives", () => {
  it("returns creatives with default limit 50", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "cr1", data: () => ({ ...validCreative, createdAt: "ts" }) }],
    } as any);
    const result = await getAdCreatives("uid1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("cr1");
  });
});

describe("getAdCreativesByCampaign", () => {
  it("queries with where clause for campaignId", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getAdCreativesByCampaign("uid1", "camp1");
    expect(mockQuery).toHaveBeenCalled();
  });
});

describe("getAdCreativeById", () => {
  it("returns creative when found", async () => {
    const { getDoc } = await import("firebase/firestore");
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      id: "cr1",
      data: () => ({ ...validCreative, createdAt: "ts" }),
    } as any);
    const result = await getAdCreativeById("uid1", "cr1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("cr1");
  });

  it("returns null when not found", async () => {
    const { getDoc } = await import("firebase/firestore");
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as any);
    const result = await getAdCreativeById("uid1", "nonexistent");
    expect(result).toBeNull();
  });
});

describe("deleteAdCreative", () => {
  it("deletes doc by creative ID", async () => {
    await deleteAdCreative("uid1", "entry1");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "adCreatives", "entry1");
    expect(mockDeleteDoc).toHaveBeenCalledWith("docRef");
  });
});

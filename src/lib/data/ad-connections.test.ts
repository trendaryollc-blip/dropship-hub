import { describe, it, expect, vi, beforeEach } from "vitest";
import { doc, setDoc, deleteDoc, getDocs, collection, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { addAdConnection, getAdConnections, getAdConnectionByPlatform, deleteAdConnection, updateAdConnection } from "./ad-connections";

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
  updateDoc: vi.fn(),
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

const validConnection = {
  platform: "facebook" as const,
  accountId: "acc123",
  accountName: "My FB Account",
  accessToken: "token123",
  expiresAt: "2025-12-31",
  status: "active" as const,
};

describe("addAdConnection", () => {
  it("creates auto-ID doc with correct collection path", async () => {
    await addAdConnection("uid1", validConnection);
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "adConnections");
    expect(mockDoc).toHaveBeenCalledWith("colRef");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", expect.objectContaining({
      platform: "facebook",
      accountId: "acc123",
      accountName: "My FB Account",
      accessToken: "token123",
      expiresAt: "2025-12-31",
      status: "active",
      createdAt: "mock-ts",
      updatedAt: "mock-ts",
    }));
  });

  it("throws on invalid platform", async () => {
    await expect(
      addAdConnection("uid1", { ...validConnection, platform: "tiktok" as any })
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(addAdConnection("uid1", validConnection)).rejects.toThrow("write fail");
  });
});

describe("getAdConnections", () => {
  it("returns connections with default limit 20", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "c1",
          data: () => ({
            platform: "facebook",
            accountId: "acc123",
            accountName: "My FB Account",
            accessToken: "token123",
            expiresAt: "2025-12-31",
            status: "active",
            createdAt: "ts",
            updatedAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getAdConnections("uid1");
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });

  it("returns empty array when no connections", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    const result = await getAdConnections("uid1");
    expect(result).toHaveLength(0);
  });
});

describe("getAdConnectionByPlatform", () => {
  it("returns active connection for matching platform", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "c1",
          data: () => ({
            platform: "facebook",
            accountId: "acc123",
            accountName: "My FB Account",
            accessToken: "token123",
            expiresAt: "2025-12-31",
            status: "active",
            createdAt: "ts",
            updatedAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getAdConnectionByPlatform("uid1", "facebook");
    expect(result).not.toBeNull();
    expect(result!.platform).toBe("facebook");
  });

  it("returns null when no matching platform", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    const result = await getAdConnectionByPlatform("uid1", "google");
    expect(result).toBeNull();
  });
});

describe("deleteAdConnection", () => {
  it("deletes doc by connection ID", async () => {
    await deleteAdConnection("uid1", "entry1");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "adConnections", "entry1");
    expect(mockDeleteDoc).toHaveBeenCalledWith("docRef");
  });
});

describe("updateAdConnection", () => {
  it("calls updateDoc with updates and updatedAt", async () => {
    const { updateDoc } = await import("firebase/firestore");
    await updateAdConnection("uid1", "entry1", { status: "expired" });
    expect(updateDoc).toHaveBeenCalledWith("docRef", { status: "expired", updatedAt: "mock-ts" });
  });
});

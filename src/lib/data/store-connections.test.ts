import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  addStoreConnection,
  getStoreConnections,
  deleteStoreConnection,
  updateStoreConnection,
} from "./store-connections";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
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
  mockDeleteDoc.mockResolvedValue(undefined as any);
  mockUpdateDoc.mockResolvedValue(undefined as any);
});

describe("addStoreConnection", () => {
  it("creates auto-ID doc in storeConnections collection", async () => {
    const store = {
      platform: "shopify",
      name: "My Store",
      url: "https://my-store.myshopify.com",
      status: "connected" as const,
    };
    const result = await addStoreConnection("uid1", store);
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "storeConnections"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...store,
      connectedAt: "mock-ts",
    });
  });

  it("returns doc ID", async () => {
    const mockRef = { id: "new-store-id" };
    mockDoc.mockReturnValue(mockRef as any);
    const result = await addStoreConnection("uid1", {
      platform: "shopify",
      name: "Store",
      url: "https://store.example.com",
      status: "connected",
    });
    expect(result).toBe("new-store-id");
  });

  it("throws on invalid URL", async () => {
    await expect(
      addStoreConnection("uid1", {
        platform: "shopify",
        name: "Store",
        url: "not-a-url",
        status: "connected",
      })
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addStoreConnection("uid1", {
        platform: "shopify",
        name: "Store",
        url: "https://store.example.com",
        status: "connected",
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getStoreConnections", () => {
  it("returns connections with limit 20", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "sc1",
          data: () => ({
            platform: "shopify",
            name: "My Store",
            url: "https://store.example.com",
            status: "connected",
            connectedAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getStoreConnections("uid1");
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("sc1");
  });

  it("orders by connectedAt desc", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getStoreConnections("uid1");
    expect(mockOrderBy).toHaveBeenCalledWith("connectedAt", "desc");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getStoreConnections("uid1")).rejects.toThrow("query fail");
  });
});

describe("deleteStoreConnection", () => {
  it("deletes doc by store ID", async () => {
    await deleteStoreConnection("uid1", "sc1");
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "storeConnections",
      "sc1"
    );
    expect(mockDeleteDoc).toHaveBeenCalledWith("docRef");
  });

  it("throws when deleteDoc fails", async () => {
    mockDeleteDoc.mockRejectedValue(new Error("delete fail"));
    await expect(deleteStoreConnection("uid1", "sc1")).rejects.toThrow(
      "delete fail"
    );
  });
});

describe("updateStoreConnection", () => {
  it("updates partial fields on correct doc", async () => {
    await updateStoreConnection("uid1", "sc1", { status: "disconnected" });
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "storeConnections",
      "sc1"
    );
    expect(mockUpdateDoc).toHaveBeenCalledWith("docRef", {
      status: "disconnected",
    });
  });

  it("updates multiple fields", async () => {
    await updateStoreConnection("uid1", "sc1", {
      status: "error",
      apiKey: "new-key",
    });
    expect(mockUpdateDoc).toHaveBeenCalledWith("docRef", {
      status: "error",
      apiKey: "new-key",
    });
  });

  it("throws when updateDoc fails", async () => {
    mockUpdateDoc.mockRejectedValue(new Error("update fail"));
    await expect(
      updateStoreConnection("uid1", "sc1", { name: "New Name" })
    ).rejects.toThrow("update fail");
  });
});

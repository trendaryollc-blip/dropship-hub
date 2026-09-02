import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  addPushedProduct,
  getPushedProducts,
  deletePushedProduct,
} from "./pushed-products";

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

describe("addPushedProduct", () => {
  it("creates auto-ID doc in pushedProducts collection", async () => {
    const product = {
      storeId: "store1",
      storeName: "My Store",
      productTitle: "Widget Pro",
      productImage: "https://example.com/img.jpg",
      productPrice: 29.99,
      productUrl: "https://example.com/product",
      productDescription: "A great widget",
      status: "pushed" as const,
    };
    const result = await addPushedProduct("uid1", product);
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "pushedProducts"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...product,
      pushedAt: "mock-ts",
    });
  });

  it("returns doc ID", async () => {
    const mockRef = { id: "pushed-id" };
    mockDoc.mockReturnValue(mockRef as any);
    const result = await addPushedProduct("uid1", {
      storeId: "s1",
      storeName: "Store",
      productTitle: "Product",
      productImage: "https://img.jpg",
      productPrice: 10,
      productUrl: "https://url",
      productDescription: "Desc",
      status: "pushed",
    });
    expect(result).toBe("pushed-id");
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addPushedProduct("uid1", {
        storeId: "s1",
        storeName: "Store",
        productTitle: "Product",
        productImage: "https://img.jpg",
        productPrice: 10,
        productUrl: "https://url",
        productDescription: "Desc",
        status: "pushed",
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getPushedProducts", () => {
  it("returns products with limit 50", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "pp1",
          data: () => ({
            storeId: "store1",
            storeName: "My Store",
            productTitle: "Widget",
            productImage: "https://img.jpg",
            productPrice: 29.99,
            productUrl: "https://url",
            productDescription: "Desc",
            status: "pushed",
            pushedAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getPushedProducts("uid1");
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("pp1");
  });

  it("orders by pushedAt desc", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getPushedProducts("uid1");
    expect(mockOrderBy).toHaveBeenCalledWith("pushedAt", "desc");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getPushedProducts("uid1")).rejects.toThrow("query fail");
  });
});

describe("deletePushedProduct", () => {
  it("deletes doc by product ID", async () => {
    await deletePushedProduct("uid1", "pp1");
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "pushedProducts",
      "pp1"
    );
    expect(mockDeleteDoc).toHaveBeenCalledWith("docRef");
  });

  it("throws when deleteDoc fails", async () => {
    mockDeleteDoc.mockRejectedValue(new Error("delete fail"));
    await expect(deletePushedProduct("uid1", "pp1")).rejects.toThrow(
      "delete fail"
    );
  });
});

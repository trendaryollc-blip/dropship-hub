import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  addProductValidation,
  getProductValidations,
  getProductValidation,
  deleteProductValidation,
} from "./product-validations";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
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
const mockDeleteDoc = vi.mocked(deleteDoc);
const mockGetDoc = vi.mocked(getDoc);
const mockGetDocs = vi.mocked(getDocs);
const mockCollection = vi.mocked(collection);
const mockQuery = vi.mocked(query);
const mockOrderBy = vi.mocked(orderBy);
const mockLimit = vi.mocked(limit);

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue({} as never);
  mockCollection.mockReturnValue({} as never);
  mockQuery.mockReturnValue({} as never);
  mockOrderBy.mockReturnValue({} as never);
  mockLimit.mockReturnValue({} as never);
  mockSetDoc.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);
});

const validEntry = {
  productTitle: "Wireless Earbuds",
  goldenScore: 82,
  goldenRank: "A",
  trendVelocity: 70,
  saturationIndex: 35,
  profitScore: 75,
  seasonalScore: 80,
  inputs: { productCost: 8, sellingPrice: 29.99 },
};

describe("addProductValidation", () => {
  it("creates doc in correct collection", async () => {
    await addProductValidation("uid1", validEntry);
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "productValidations");
    expect(mockSetDoc).toHaveBeenCalled();
  });

  it("calls setDoc with correct data", async () => {
    await addProductValidation("uid1", validEntry);
    const callArgs = mockSetDoc.mock.calls[0];
    expect(callArgs[1]).toMatchObject({
      productTitle: "Wireless Earbuds",
      goldenScore: 82,
      goldenRank: "A",
    });
    expect(callArgs[1]).toHaveProperty("createdAt", "mock-ts");
  });

  it("throws on invalid input", async () => {
    await expect(
      addProductValidation("uid1", { ...validEntry, goldenScore: -1 })
    ).rejects.toThrow();
  });

  it("throws on missing required fields", async () => {
    await expect(
      addProductValidation("uid1", { ...validEntry, productTitle: "" })
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("firestore fail"));
    await expect(addProductValidation("uid1", validEntry)).rejects.toThrow("firestore fail");
  });

  it("accepts optional fields", async () => {
    await addProductValidation("uid1", {
      ...validEntry,
      productImage: "https://example.com/img.jpg",
      productUrl: "https://example.com/product",
    });
    expect(mockSetDoc).toHaveBeenCalled();
  });
});

describe("getProductValidations", () => {
  it("returns validations ordered by createdAt desc", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "val1",
          data: () => ({
            productTitle: "Product A",
            goldenScore: 85,
            goldenRank: "A",
            trendVelocity: 70,
            saturationIndex: 30,
            profitScore: 80,
            seasonalScore: 75,
            inputs: {},
            createdAt: "ts",
          }),
        },
      ],
    } as never);

    const result = await getProductValidations("uid1");
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("val1");
  });

  it("respects custom limit", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as never);
    await getProductValidations("uid1", 5);
    expect(mockLimit).toHaveBeenCalledWith(5);
  });

  it("uses users/{uid}/productValidations collection", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as never);
    await getProductValidations("uid1");
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "productValidations");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getProductValidations("uid1")).rejects.toThrow("query fail");
  });
});

describe("getProductValidation", () => {
  it("returns single validation", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: "val1",
      data: () => ({
        productTitle: "Test Product",
        goldenScore: 90,
        goldenRank: "S",
        trendVelocity: 80,
        saturationIndex: 20,
        profitScore: 85,
        seasonalScore: 88,
        inputs: {},
        createdAt: "ts",
      }),
    } as never);

    const result = await getProductValidation("uid1", "val1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("val1");
    expect(result!.productTitle).toBe("Test Product");
  });

  it("returns null for non-existent doc", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false } as never);
    const result = await getProductValidation("uid1", "nonexistent");
    expect(result).toBeNull();
  });

  it("throws when getDoc fails", async () => {
    mockGetDoc.mockRejectedValue(new Error("get fail"));
    await expect(getProductValidation("uid1", "val1")).rejects.toThrow("get fail");
  });
});

describe("deleteProductValidation", () => {
  it("deletes correct doc", async () => {
    await deleteProductValidation("uid1", "val1");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "productValidations", "val1");
    expect(mockDeleteDoc).toHaveBeenCalledWith({});
  });

  it("throws when deleteDoc fails", async () => {
    mockDeleteDoc.mockRejectedValue(new Error("delete fail"));
    await expect(deleteProductValidation("uid1", "val1")).rejects.toThrow("delete fail");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addProductValidation,
  getProductValidations,
  getProductValidation,
  deleteProductValidation,
} from "./product-validations";

// The implementation uses the Firebase ADMIN SDK (getAdminDB) with a
// chainable collection/document API — not the client SDK — so the mock
// mirrors that call chain: db.collection("users").doc(uid)
//   .collection("productValidations").doc()/orderBy()/limit()/get().
vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

vi.mock("./utils", () => ({
  handleFirestoreError: vi.fn((_ctx: string, err: unknown) => {
    throw err;
  }),
}));

import { getAdminDB } from "@/lib/firebase-admin";

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockListGet = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockValidationsDoc = vi.fn();

const docRef = { id: "new-doc-id", set: mockSet, get: mockGet, delete: mockDelete };
const validationsCol = {
  doc: mockValidationsDoc,
  orderBy: mockOrderBy,
};
const userDoc = { collection: vi.fn(() => validationsCol) };
const dbMock = {
  collection: vi.fn(() => ({ doc: vi.fn(() => userDoc) })),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockValidationsDoc.mockReturnValue(docRef);
  mockOrderBy.mockReturnValue({ limit: mockLimit });
  mockLimit.mockReturnValue({ get: mockListGet });
  mockSet.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
  mockListGet.mockResolvedValue({ docs: [] });
  vi.mocked(getAdminDB).mockResolvedValue(dbMock as never);
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
    expect(dbMock.collection).toHaveBeenCalledWith("users");
    expect(userDoc.collection).toHaveBeenCalledWith("productValidations");
    expect(mockValidationsDoc).toHaveBeenCalledWith();
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it("calls set with correct data", async () => {
    await addProductValidation("uid1", validEntry);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        productTitle: "Wireless Earbuds",
        goldenScore: 82,
        goldenRank: "A",
        createdAt: expect.any(String),
      })
    );
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

  it("throws when set fails", async () => {
    mockSet.mockRejectedValueOnce(new Error("firestore fail"));
    await expect(addProductValidation("uid1", validEntry)).rejects.toThrow("firestore fail");
  });

  it("accepts optional fields", async () => {
    await addProductValidation("uid1", {
      ...validEntry,
      productImage: "https://example.com/img.jpg",
      productUrl: "https://example.com/product",
    });
    expect(mockSet).toHaveBeenCalled();
  });
});

describe("getProductValidations", () => {
  const sampleDoc = {
    productTitle: "Product A",
    goldenScore: 85,
    goldenRank: "A",
    trendVelocity: 70,
    saturationIndex: 30,
    profitScore: 80,
    seasonalScore: 75,
    inputs: {},
    createdAt: "ts",
  };

  it("returns validations ordered by createdAt desc", async () => {
    mockListGet.mockResolvedValueOnce({ docs: [{ id: "val1", data: () => sampleDoc }] });

    const result = await getProductValidations("uid1");
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("val1");
    expect(result[0].productTitle).toBe("Product A");
  });

  it("respects custom limit", async () => {
    await getProductValidations("uid1", 5);
    expect(mockLimit).toHaveBeenCalledWith(5);
  });

  it("uses users/{uid}/productValidations collection", async () => {
    await getProductValidations("uid1");
    expect(dbMock.collection).toHaveBeenCalledWith("users");
    expect(userDoc.collection).toHaveBeenCalledWith("productValidations");
  });

  it("throws when get fails", async () => {
    mockListGet.mockRejectedValueOnce(new Error("query fail"));
    await expect(getProductValidations("uid1")).rejects.toThrow("query fail");
  });
});

describe("getProductValidation", () => {
  it("returns single validation", async () => {
    // Admin SDK DocumentSnapshot exposes `exists` as a boolean property
    mockGet.mockResolvedValueOnce({
      exists: true,
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
    });

    const result = await getProductValidation("uid1", "val1");
    expect(mockValidationsDoc).toHaveBeenCalledWith("val1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("val1");
    expect(result!.productTitle).toBe("Test Product");
  });

  it("returns null for non-existent doc", async () => {
    mockGet.mockResolvedValueOnce({ exists: false });
    const result = await getProductValidation("uid1", "nonexistent");
    expect(result).toBeNull();
  });

  it("throws when get fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("get fail"));
    await expect(getProductValidation("uid1", "val1")).rejects.toThrow("get fail");
  });
});

describe("deleteProductValidation", () => {
  it("deletes correct doc", async () => {
    await deleteProductValidation("uid1", "val1");
    expect(mockValidationsDoc).toHaveBeenCalledWith("val1");
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("throws when delete fails", async () => {
    mockDelete.mockRejectedValueOnce(new Error("delete fail"));
    await expect(deleteProductValidation("uid1", "val1")).rejects.toThrow("delete fail");
  });
});

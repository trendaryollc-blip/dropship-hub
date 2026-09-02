import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  cacheEnrichment,
  getEnrichmentCache,
} from "./enrichment-cache";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue("docRef" as any);
  mockSetDoc.mockResolvedValue(undefined as any);
});

describe("cacheEnrichment", () => {
  it("upserts using productKey as doc ID", async () => {
    await cacheEnrichment("uid1", "product-123", {
      brand: "TestBrand",
      rating: 4.5,
    });
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "enrichmentCache",
      "product-123"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      productKey: "product-123",
      data: { brand: "TestBrand", rating: 4.5 },
      createdAt: "mock-ts",
    });
  });

  it("uses correct collection path", async () => {
    await cacheEnrichment("uid1", "key1", { a: 1 });
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "enrichmentCache",
      "key1"
    );
  });

  it("throws on empty productKey", async () => {
    await expect(
      cacheEnrichment("uid1", "", { data: true })
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      cacheEnrichment("uid1", "key1", { a: 1 })
    ).rejects.toThrow("write fail");
  });
});

describe("getEnrichmentCache", () => {
  it("returns parsed data when document exists", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: "product-123",
      data: () => ({
        productKey: "product-123",
        data: { brand: "Brand" },
        createdAt: "ts",
      }),
    } as any);

    const result = await getEnrichmentCache("uid1", "product-123");
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "enrichmentCache",
      "product-123"
    );
    expect(result).not.toBeNull();
    expect(result!.id).toBe("product-123");
    expect(result!.productKey).toBe("product-123");
  });

  it("returns null when document does not exist", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    } as any);

    const result = await getEnrichmentCache("uid1", "nonexistent");
    expect(result).toBeNull();
  });

  it("throws when getDoc fails", async () => {
    mockGetDoc.mockRejectedValue(new Error("get fail"));
    await expect(
      getEnrichmentCache("uid1", "key1")
    ).rejects.toThrow("get fail");
  });
});

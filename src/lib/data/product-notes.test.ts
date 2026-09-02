import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { saveProductNote, getProductNote } from "./product-notes";

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

describe("saveProductNote", () => {
  it("upserts using productId as doc ID", async () => {
    await saveProductNote("uid1", "prod1", "This is a note");
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "notes",
      "prod1"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      productId: "prod1",
      note: "This is a note",
      updatedAt: "mock-ts",
    });
  });

  it("uses correct collection path users/{uid}/notes", async () => {
    await saveProductNote("uid1", "prod1", "Note content");
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "notes",
      "prod1"
    );
  });

  it("overwrites existing note for same productId", async () => {
    await saveProductNote("uid1", "prod1", "First note");
    await saveProductNote("uid1", "prod1", "Updated note");
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
    expect(mockSetDoc).toHaveBeenLastCalledWith("docRef", {
      productId: "prod1",
      note: "Updated note",
      updatedAt: "mock-ts",
    });
  });

  it("handles empty note", async () => {
    await saveProductNote("uid1", "prod1", "");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      productId: "prod1",
      note: "",
      updatedAt: "mock-ts",
    });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      saveProductNote("uid1", "prod1", "Note")
    ).rejects.toThrow("write fail");
  });
});

describe("getProductNote", () => {
  it("returns note text when document exists", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        productId: "prod1",
        note: "My note content",
        updatedAt: "ts",
      }),
    } as any);

    const result = await getProductNote("uid1", "prod1");
    expect(mockDoc).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "notes",
      "prod1"
    );
    expect(result).toBe("My note content");
  });

  it("returns empty string when document does not exist", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false } as any);
    const result = await getProductNote("uid1", "nonexistent");
    expect(result).toBe("");
  });

  it("throws when getDoc fails", async () => {
    mockGetDoc.mockRejectedValue(new Error("get fail"));
    await expect(getProductNote("uid1", "prod1")).rejects.toThrow("get fail");
  });
});

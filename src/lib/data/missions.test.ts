import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { addMission, getMissions, toggleMission } from "./missions";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
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
const mockUpdateDoc = vi.mocked(updateDoc);
const mockGetDocs = vi.mocked(getDocs);
const mockCollection = vi.mocked(collection);
const mockQuery = vi.mocked(query);
const mockWhere = vi.mocked(where);
const mockOrderBy = vi.mocked(orderBy);
const mockLimit = vi.mocked(limit);

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue("docRef" as any);
  mockCollection.mockReturnValue("colRef" as any);
  mockQuery.mockReturnValue("q" as any);
  mockWhere.mockReturnValue("w" as any);
  mockOrderBy.mockReturnValue("ob" as any);
  mockLimit.mockReturnValue("l" as any);
  mockSetDoc.mockResolvedValue(undefined as any);
  mockUpdateDoc.mockResolvedValue(undefined as any);
});

describe("addMission", () => {
  it("creates auto-ID doc with correct collection path", async () => {
    await addMission("uid1", {
      text: "Check supplier prices",
      done: false,
      date: "2025-01-15",
    });
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "missions");
    expect(mockDoc).toHaveBeenCalledWith("colRef");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      text: "Check supplier prices",
      done: false,
      date: "2025-01-15",
      createdAt: "mock-ts",
    });
  });

  it("throws on invalid date format", async () => {
    await expect(
      addMission("uid1", {
        text: "Task",
        done: false,
        date: "01-15-2025",
      })
    ).rejects.toThrow();
  });

  it("throws on empty text", async () => {
    await expect(
      addMission("uid1", {
        text: "",
        done: false,
        date: "2025-01-15",
      })
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addMission("uid1", {
        text: "Task",
        done: false,
        date: "2025-01-15",
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getMissions", () => {
  it("returns missions filtered by date", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "m1",
          data: () => ({
            text: "Mission 1",
            done: false,
            date: "2025-01-15",
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getMissions("uid1", "2025-01-15");
    expect(mockWhere).toHaveBeenCalledWith("date", "==", "2025-01-15");
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("m1");
  });

  it("uses today's date when no date provided", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    const today = new Date().toISOString().split("T")[0];
    await getMissions("uid1");
    expect(mockWhere).toHaveBeenCalledWith("date", "==", today);
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getMissions("uid1", "2025-01-15")).rejects.toThrow("query fail");
  });
});

describe("toggleMission", () => {
  it("updates done field to true", async () => {
    await toggleMission("uid1", "mission1", true);
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "missions", "mission1");
    expect(mockUpdateDoc).toHaveBeenCalledWith("docRef", { done: true });
  });

  it("updates done field to false", async () => {
    await toggleMission("uid1", "mission1", false);
    expect(mockUpdateDoc).toHaveBeenCalledWith("docRef", { done: false });
  });

  it("throws when updateDoc fails", async () => {
    mockUpdateDoc.mockRejectedValue(new Error("update fail"));
    await expect(toggleMission("uid1", "mission1", true)).rejects.toThrow("update fail");
  });
});

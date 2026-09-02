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
  startAfter,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import {
  addAlert,
  getAlerts,
  markAlertRead,
  markAllAlertsRead,
} from "./alerts";

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
  startAfter: vi.fn(),
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    commit: vi.fn(),
  })),
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
const mockWriteBatch = vi.mocked(writeBatch);

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

describe("addAlert", () => {
  it("creates auto-ID doc with correct collection path", async () => {
    await addAlert("uid1", {
      type: "opportunity",
      title: "New Opportunity",
      description: "Found a new niche",
      read: false,
    });
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "alerts");
    expect(mockDoc).toHaveBeenCalledWith("colRef");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      type: "opportunity",
      title: "New Opportunity",
      description: "Found a new niche",
      read: false,
      createdAt: "mock-ts",
    });
  });

  it("includes optional fields", async () => {
    await addAlert("uid1", {
      type: "risk",
      title: "Risk Alert",
      description: "High competition detected",
      read: false,
      confidence: 0.85,
      aiAnalysis: "Analysis text",
    });
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      type: "risk",
      title: "Risk Alert",
      description: "High competition detected",
      read: false,
      confidence: 0.85,
      aiAnalysis: "Analysis text",
      createdAt: "mock-ts",
    });
  });

  it("throws on invalid type", async () => {
    await expect(
      addAlert("uid1", {
        type: "invalid" as any,
        title: "Title",
        description: "Desc",
        read: false,
      })
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addAlert("uid1", {
        type: "info",
        title: "Title",
        description: "Desc",
        read: false,
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getAlerts", () => {
  it("returns alerts with default limit 20", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "a1",
          data: () => ({
            type: "info",
            title: "Info",
            description: "Desc",
            read: false,
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getAlerts("uid1");
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("a1");
  });

  it("respects custom limit", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getAlerts("uid1", 50);
    expect(mockLimit).toHaveBeenCalledWith(50);
  });

  it("orders by createdAt desc", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getAlerts("uid1");
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getAlerts("uid1")).rejects.toThrow("query fail");
  });
});

describe("markAlertRead", () => {
  it("updates read to true on correct doc", async () => {
    await markAlertRead("uid1", "alert1");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "alerts", "alert1");
    expect(mockUpdateDoc).toHaveBeenCalledWith("docRef", { read: true });
  });

  it("throws when updateDoc fails", async () => {
    mockUpdateDoc.mockRejectedValue(new Error("update fail"));
    await expect(markAlertRead("uid1", "alert1")).rejects.toThrow("update fail");
  });
});

describe("markAllAlertsRead", () => {
  it("batches all unread alerts in groups of 50", async () => {
    const batchMock = { update: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    mockWriteBatch.mockReturnValue(batchMock as any);

    const docRefs = Array.from({ length: 3 }, (_, i) => `ref${i}`);
    mockGetDocs
      .mockResolvedValueOnce({
        docs: docRefs.map((ref, i) => ({
          ref,
          data: () => ({}),
        })),
        empty: false,
      } as any)
      .mockResolvedValueOnce({ docs: [], empty: true } as any);

    await markAllAlertsRead("uid1");

    expect(mockWriteBatch).toHaveBeenCalled();
    expect(batchMock.update).toHaveBeenCalledTimes(3);
    expect(batchMock.commit).toHaveBeenCalled();
  });

  it("does nothing when no unread alerts exist", async () => {
    mockGetDocs.mockResolvedValue({ docs: [], empty: true } as any);
    await markAllAlertsRead("uid1");
    expect(mockWriteBatch).not.toHaveBeenCalled();
  });

  it("paginates through multiple batches", async () => {
    const batchMock = { update: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    mockWriteBatch.mockReturnValue(batchMock as any);

    const docs50 = Array.from({ length: 50 }, (_, i) => ({
      ref: `ref${i}`,
      data: () => ({}),
    }));
    const lastDoc = docs50[docs50.length - 1];

    mockGetDocs
      .mockResolvedValueOnce({ docs: docs50, empty: false } as any)
      .mockResolvedValueOnce({
        docs: [{ ref: "ref50", data: () => ({}) }],
        empty: false,
      } as any)
      .mockResolvedValueOnce({ docs: [], empty: true } as any);

    await markAllAlertsRead("uid1");

    expect(batchMock.commit).toHaveBeenCalledTimes(2);
  });

  it("throws when batch commit fails", async () => {
    const batchMock = { update: vi.fn(), commit: vi.fn().mockRejectedValue(new Error("batch fail")) };
    mockWriteBatch.mockReturnValue(batchMock as any);

    mockGetDocs.mockResolvedValue({
      docs: [{ ref: "ref0", data: () => ({}) }],
      empty: false,
    } as any);

    await expect(markAllAlertsRead("uid1")).rejects.toThrow("batch fail");
  });
});

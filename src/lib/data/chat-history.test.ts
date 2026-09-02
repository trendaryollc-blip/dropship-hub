import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { saveChatMessage, getChatHistory } from "./chat-history";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
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
});

describe("saveChatMessage", () => {
  it("creates auto-ID doc with correct collection path", async () => {
    await saveChatMessage("uid1", { role: "user", content: "Hello" });
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "chatHistory");
    expect(mockDoc).toHaveBeenCalledWith("colRef");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      role: "user",
      content: "Hello",
      timestamp: "mock-ts",
    });
  });

  it("saves message with provider", async () => {
    await saveChatMessage("uid1", {
      role: "assistant",
      content: "Response",
      provider: "gemini",
    });
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      role: "assistant",
      content: "Response",
      provider: "gemini",
      timestamp: "mock-ts",
    });
  });

  it("throws on invalid role", async () => {
    await expect(
      saveChatMessage("uid1", { role: "admin" as any, content: "test" })
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      saveChatMessage("uid1", { role: "user", content: "test" })
    ).rejects.toThrow("write fail");
  });
});

describe("getChatHistory", () => {
  it("returns chat messages ordered by timestamp asc, limited to 100", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "msg1",
          data: () => ({
            role: "user",
            content: "Hello",
            timestamp: "ts",
          }),
        },
        {
          id: "msg2",
          data: () => ({
            role: "assistant",
            content: "Hi there",
            provider: "gemini",
            timestamp: "ts2",
          }),
        },
      ],
    } as any);

    const result = await getChatHistory("uid1");
    expect(mockOrderBy).toHaveBeenCalledWith("timestamp", "asc");
    expect(mockLimit).toHaveBeenCalledWith(100);
    expect(result).toHaveLength(2);
    expect(result![0].id).toBe("msg1");
    expect(result![1].id).toBe("msg2");
  });

  it("returns empty array for no messages", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    const result = await getChatHistory("uid1");
    expect(result).toEqual([]);
  });

  it("uses correct collection path", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getChatHistory("uid1");
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "chatHistory");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getChatHistory("uid1")).rejects.toThrow("query fail");
  });
});

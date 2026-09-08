import { describe, it, expect, vi, beforeEach } from "vitest";
import { doc, setDoc, deleteDoc, getDocs, collection, query, orderBy, limit, where, updateDoc } from "firebase/firestore";
import { addKnowledgeBaseEntry, getKnowledgeBaseEntries, deleteKnowledgeBaseEntry, addEscalationRule, getEscalationRules, deleteEscalationRule } from "./cs-enhanced";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "mock-ts"),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("./utils", () => ({
  handleFirestoreError: vi.fn((_ctx: string, err: unknown) => { throw err; }),
}));

const mockDoc = vi.mocked(doc);
const mockSetDoc = vi.mocked(setDoc);
const mockDeleteDoc = vi.mocked(deleteDoc);
const mockGetDocs = vi.mocked(getDocs);
const mockCollection = vi.mocked(collection);
const mockQuery = vi.mocked(query);
const mockWhere = vi.mocked(where);
const mockOrderBy = vi.mocked(orderBy);
const mockLimit = vi.mocked(limit);

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue({ id: "mock-id" } as any);
  mockCollection.mockReturnValue("colRef" as any);
  mockQuery.mockReturnValue("q" as any);
  mockWhere.mockReturnValue("w" as any);
  mockOrderBy.mockReturnValue("ob" as any);
  mockLimit.mockReturnValue("l" as any);
  mockSetDoc.mockResolvedValue(undefined as any);
  mockDeleteDoc.mockResolvedValue(undefined as any);
});

describe("addKnowledgeBaseEntry", () => {
  it("creates doc in csKnowledgeBase collection", async () => {
    const entry = {
      category: "faq",
      title: "Shipping Time",
      content: "7-15 business days",
      keywords: ["shipping", "time"],
      usageCount: 0,
    };
    const id = await addKnowledgeBaseEntry("uid1", entry);
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "users", "uid1", "csKnowledgeBase");
    expect(id).toBeDefined();
  });
});

describe("getKnowledgeBaseEntries", () => {
  it("fetches entries without category filter", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    const result = await getKnowledgeBaseEntries("uid1");
    expect(result).toEqual([]);
  });

  it("fetches entries with category filter", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getKnowledgeBaseEntries("uid1", "faq");
    expect(mockWhere).toHaveBeenCalledWith("category", "==", "faq");
  });
});

describe("deleteKnowledgeBaseEntry", () => {
  it("deletes entry by id", async () => {
    const result = await deleteKnowledgeBaseEntry("uid1", "entry-1");
    expect(result).toBe(true);
  });
});

describe("addEscalationRule", () => {
  it("creates doc in csEscalationRules collection", async () => {
    const rule = {
      name: "High Value",
      enabled: true,
      conditions: { minOrderValue: 200 },
      action: "escalate",
      priority: "high",
    };
    const id = await addEscalationRule("uid1", rule);
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "users", "uid1", "csEscalationRules");
    expect(id).toBeDefined();
  });
});

describe("getEscalationRules", () => {
  it("fetches rules", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    const result = await getEscalationRules("uid1");
    expect(result).toEqual([]);
  });
});

describe("deleteEscalationRule", () => {
  it("deletes rule by id", async () => {
    const result = await deleteEscalationRule("uid1", "rule-1");
    expect(result).toBe(true);
  });
});

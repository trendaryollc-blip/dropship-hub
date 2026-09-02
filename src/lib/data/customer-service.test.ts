import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  addCSConversation,
  getCSConversations,
  addCSMessage,
  getCSMessages,
  addCSTemplate,
  getCSTemplates,
  deleteCSTemplate,
} from "./customer-service";

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
  mockDeleteDoc.mockResolvedValue(undefined as any);
});

describe("addCSConversation", () => {
  it("creates auto-ID doc in csConversations collection", async () => {
    const conv = {
      customerName: "John Doe",
      customerEmail: "john@example.com",
      platform: "Shopify",
      status: "active" as const,
      subject: "Order Issue",
      lastMessage: "Where is my order?",
      messageCount: 3,
      aiHandled: false,
    };
    await addCSConversation("uid1", conv);
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "csConversations"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...conv,
      createdAt: "mock-ts",
    });
  });

  it("throws on invalid email", async () => {
    await expect(
      addCSConversation("uid1", {
        customerName: "John",
        customerEmail: "not-an-email",
        platform: "Shopify",
        status: "active",
        subject: "Issue",
        lastMessage: "Help",
        messageCount: 1,
        aiHandled: false,
      })
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addCSConversation("uid1", {
        customerName: "John",
        customerEmail: "john@example.com",
        platform: "Shopify",
        status: "active",
        subject: "Issue",
        lastMessage: "Help",
        messageCount: 1,
        aiHandled: false,
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getCSConversations", () => {
  it("returns conversations with limit 50", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "conv1",
          data: () => ({
            customerName: "John",
            customerEmail: "john@example.com",
            platform: "Shopify",
            status: "active",
            subject: "Issue",
            lastMessage: "Help",
            messageCount: 3,
            aiHandled: false,
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getCSConversations("uid1");
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("conv1");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getCSConversations("uid1")).rejects.toThrow("query fail");
  });
});

describe("addCSMessage", () => {
  it("creates auto-ID doc in csMessages collection", async () => {
    const msg = {
      conversationId: "conv1",
      role: "customer" as const,
      content: "Where is my order?",
    };
    await addCSMessage("uid1", msg);
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "csMessages"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...msg,
      createdAt: "mock-ts",
    });
  });

  it("includes optional fields", async () => {
    const msg = {
      conversationId: "conv1",
      role: "ai" as const,
      content: "Let me check",
      confidence: 0.92,
      escalated: false,
    };
    await addCSMessage("uid1", msg);
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...msg,
      createdAt: "mock-ts",
    });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addCSMessage("uid1", {
        conversationId: "conv1",
        role: "customer",
        content: "Help",
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getCSMessages", () => {
  it("returns messages filtered by conversationId", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "msg1",
          data: () => ({
            conversationId: "conv1",
            role: "customer",
            content: "Hello",
            createdAt: "ts",
          }),
        },
        {
          id: "msg2",
          data: () => ({
            conversationId: "conv1",
            role: "ai",
            content: "Hi there",
            confidence: 0.95,
            createdAt: "ts2",
          }),
        },
      ],
    } as any);

    const result = await getCSMessages("uid1", "conv1");
    expect(mockWhere).toHaveBeenCalledWith("conversationId", "==", "conv1");
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "asc");
    expect(mockLimit).toHaveBeenCalledWith(100);
    expect(result).toHaveLength(2);
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getCSMessages("uid1", "conv1")).rejects.toThrow("query fail");
  });
});

describe("addCSTemplate", () => {
  it("creates auto-ID doc in csTemplates collection", async () => {
    const template = {
      name: "Order Status",
      category: "shipping",
      subject: "Your Order Status",
      body: "Your order {{orderId}} is {{status}}",
      variables: ["orderId", "status"],
      usageCount: 0,
    };
    await addCSTemplate("uid1", template);
    expect(mockCollection).toHaveBeenCalledWith(
      {},
      "users",
      "uid1",
      "csTemplates"
    );
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...template,
      createdAt: "mock-ts",
    });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addCSTemplate("uid1", {
        name: "Test",
        category: "general",
        subject: "Test",
        body: "Body",
        variables: [],
        usageCount: 0,
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getCSTemplates", () => {
  it("returns templates with limit 20", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "t1",
          data: () => ({
            name: "Order Status",
            category: "shipping",
            subject: "Your Order Status",
            body: "Body",
            variables: ["orderId"],
            usageCount: 5,
            createdAt: "ts",
          }),
        },
      ],
    } as any);

    const result = await getCSTemplates("uid1");
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("t1");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getCSTemplates("uid1")).rejects.toThrow("query fail");
  });
});

describe("deleteCSTemplate", () => {
  it("deletes doc by template ID", async () => {
    await deleteCSTemplate("uid1", "t1");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "csTemplates", "t1");
    expect(mockDeleteDoc).toHaveBeenCalledWith("docRef");
  });

  it("throws when deleteDoc fails", async () => {
    mockDeleteDoc.mockRejectedValue(new Error("delete fail"));
    await expect(deleteCSTemplate("uid1", "t1")).rejects.toThrow("delete fail");
  });
});

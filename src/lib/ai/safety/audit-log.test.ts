import { describe, it, expect, vi, beforeEach } from "vitest";
import { logAIAction, logToolCalled, logToolExecuted, logToolFailed, logToolConfirmed, logToolCancelled, getAuditLog, getAuditLogForTool } from "./audit-log";

const mockSet = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn().mockResolvedValue({ docs: [] });
const mockDocRef = { id: "audit_123", set: mockSet };

const mockDocFn = vi.fn(() => mockDocRef);
const mockCollectionFn = vi.fn(() => ({ doc: mockDocFn }));
const mockUserDocFn = vi.fn(() => ({ collection: mockCollectionFn }));
const mockUsersColFn = vi.fn(() => ({ doc: mockUserDocFn }));
const mockGetAdminDB = vi.fn();

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: (...args: unknown[]) => mockGetAdminDB(...args),
}));

beforeEach(() => {
  mockSet.mockClear();
  mockGet.mockClear();
  mockDocFn.mockClear();
  mockCollectionFn.mockClear();
  mockUserDocFn.mockClear();
  mockUsersColFn.mockClear();
  mockGetAdminDB.mockClear();

  mockGet.mockResolvedValue({ docs: [] });
  mockGetAdminDB.mockResolvedValue({ collection: mockUsersColFn });
});

describe("Audit Log", () => {
  describe("logAIAction", () => {
    it("creates an audit log entry", async () => {
      const entry = {
        uid: "user_1",
        toolId: "test_tool",
        executionId: "exec_1",
        action: "tool_called" as const,
        input: { key: "value" },
        mode: "ai_assist" as const,
        autonomyLevel: 1 as const,
      };

      const id = await logAIAction(entry);
      expect(id).toBe("audit_123");
      expect(mockSet).toHaveBeenCalled();
      const savedEntry = mockSet.mock.calls[0][0];
      expect(savedEntry.uid).toBe("user_1");
      expect(savedEntry.toolId).toBe("test_tool");
      expect(savedEntry.action).toBe("tool_called");
      expect(savedEntry).toHaveProperty("timestamp");
    });
  });

  describe("logToolCalled", () => {
    it("logs a tool_called event", async () => {
      const id = await logToolCalled("user_1", "calculate_profit", "exec_1", { cost: 10 }, "ai_assist", 1);
      expect(id).toBe("audit_123");
      const savedEntry = mockSet.mock.calls[0][0];
      expect(savedEntry.action).toBe("tool_called");
      expect(savedEntry.input).toEqual({ cost: 10 });
    });
  });

  describe("logToolExecuted", () => {
    it("logs a tool_executed event with result", async () => {
      const result = { success: true, data: { profit: 50 }, summary: "Done" };
      const id = await logToolExecuted("user_1", "calculate_profit", "exec_1", { cost: 10 }, result, "ai_assist", 1);
      expect(id).toBe("audit_123");
      const savedEntry = mockSet.mock.calls[0][0];
      expect(savedEntry.action).toBe("tool_executed");
      expect(savedEntry.result).toEqual(result);
    });
  });

  describe("logToolFailed", () => {
    it("logs a tool_failed event with error", async () => {
      const id = await logToolFailed("user_1", "test_tool", "exec_1", {}, "Something went wrong", "manual", 2);
      expect(id).toBe("audit_123");
      const savedEntry = mockSet.mock.calls[0][0];
      expect(savedEntry.action).toBe("tool_failed");
      expect(savedEntry.error).toBe("Something went wrong");
    });
  });

  describe("logToolConfirmed", () => {
    it("logs a tool_confirmed event", async () => {
      const id = await logToolConfirmed("user_1", "place_order", "exec_1", "ai_assist", 3);
      expect(id).toBe("audit_123");
      const savedEntry = mockSet.mock.calls[0][0];
      expect(savedEntry.action).toBe("tool_confirmed");
      expect(savedEntry.input).toEqual({});
    });
  });

  describe("logToolCancelled", () => {
    it("logs a tool_cancelled event", async () => {
      const id = await logToolCancelled("user_1", "place_order", "exec_1", "ai_assist", 3);
      expect(id).toBe("audit_123");
      const savedEntry = mockSet.mock.calls[0][0];
      expect(savedEntry.action).toBe("tool_cancelled");
    });
  });

  describe("getAuditLog", () => {
    it("fetches audit log entries", async () => {
      const mockDocs = [
        { data: () => ({ id: "1", toolId: "tool_a" }) },
        { data: () => ({ id: "2", toolId: "tool_b" }) },
      ];
      mockGet.mockResolvedValue({ docs: mockDocs });

      const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockGetCollection = { orderBy: mockOrderBy };

      mockUserDocFn.mockReturnValue({ collection: vi.fn(() => mockGetCollection) } as any);

      const entries = await getAuditLog("user_1", 50);
      expect(entries.length).toBe(2);
      expect(entries[0].toolId).toBe("tool_a");
    });
  });

  describe("getAuditLogForTool", () => {
    it("fetches audit log entries filtered by toolId", async () => {
      const mockDocs = [
        { data: () => ({ id: "1", toolId: "calculate_profit" }) },
      ];
      mockGet.mockResolvedValue({ docs: mockDocs });

      const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockGetCollection = { where: mockWhere };

      mockUserDocFn.mockReturnValue({ collection: vi.fn(() => mockGetCollection) } as any);

      const entries = await getAuditLogForTool("user_1", "calculate_profit", 20);
      expect(entries.length).toBe(1);
      expect(entries[0].toolId).toBe("calculate_profit");
    });
  });
});

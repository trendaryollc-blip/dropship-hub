import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "../tools/registry";
import type { ToolExecutionContext } from "../types";

import { needsConfirmation } from "../safety/confirmations";
import { checkGuardrails } from "../safety/guardrails";

const { mockSet, mockUpdate, mockGet, mockTopCollectionFn } = vi.hoisted(() => {
  const mockSet = vi.fn().mockResolvedValue(undefined);
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockGet = vi.fn().mockResolvedValue({ exists: false, data: () => null });
  const mockDeepDocRef = { get: mockGet, set: mockSet, update: mockUpdate };
  const mockDeepDocFn = vi.fn(() => mockDeepDocRef);
  const mockDeepCollectionFn = vi.fn(() => ({ doc: mockDeepDocFn }));
  const mockTopDocRef = { get: mockGet, set: mockSet, update: mockUpdate, collection: mockDeepCollectionFn };
  const mockTopDocFn = vi.fn(() => mockTopDocRef);
  const mockTopCollectionFn = vi.fn(() => ({ doc: mockTopDocFn }));
  return { mockSet, mockUpdate, mockGet, mockTopCollectionFn };
});

vi.mock("../safety/audit-log", () => ({
  logToolCalled: vi.fn().mockResolvedValue("log_1"),
  logToolExecuted: vi.fn().mockResolvedValue("log_2"),
  logToolFailed: vi.fn().mockResolvedValue("log_3"),
  logToolConfirmed: vi.fn().mockResolvedValue("log_4"),
  logToolCancelled: vi.fn().mockResolvedValue("log_5"),
  logAIAction: vi.fn().mockResolvedValue("log_6"),
  getAuditLog: vi.fn().mockResolvedValue([]),
  getAuditLogForTool: vi.fn().mockResolvedValue([]),
}));

vi.mock("../safety/guardrails", () => ({
  checkGuardrails: vi.fn().mockResolvedValue({ allowed: true }),
  recordAction: vi.fn().mockResolvedValue(undefined),
  getGuardrailStatus: vi.fn().mockResolvedValue({ hourlyActions: 0, dailyActions: 0, dailyCost: 0, limits: {} }),
}));

vi.mock("../safety/confirmations", () => ({
  needsConfirmation: vi.fn().mockReturnValue({ required: false, reason: "", riskLevel: "low" }),
  checkDollarThreshold: vi.fn().mockReturnValue({ exceeds: false, estimatedDollars: 0 }),
  getConfirmationSummary: vi.fn().mockReturnValue({ toolName: "", description: "", inputSummary: "" }),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({
    collection: mockTopCollectionFn,
  }),
}));

const context: ToolExecutionContext = {
  uid: "test-user",
  executionId: "exec_test",
  trigger: "ai_chat",
  mode: "ai_assist",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ exists: false, data: () => null });
  mockSet.mockResolvedValue(undefined);
  mockUpdate.mockResolvedValue(undefined);

  ToolRegistry.register({
    id: "test_tool",
    name: "Test Tool",
    description: "A test tool",
    safetyLevel: "safe",
    category: "data",
    inputSchema: z.object({}).passthrough(),
    execute: vi.fn().mockResolvedValue({ success: true, data: { result: 42 }, summary: "Success" }),
  });
});

import { runTool, getExecutionRecord, cancelExecution } from "./runner";

describe("Tool Runner", () => {
  describe("runTool", () => {
    it("executes a tool successfully", async () => {
      const result = await runTool("test_tool", { key: "value" }, context, {
        skipGuardrails: true,
        skipConfirmation: true,
      });

      expect(result.result.success).toBe(true);
      expect(result.needsConfirmation).toBe(false);
      expect(result.executionRecord.status).toBe("completed");
    });

    it("returns error for non-existent tool", async () => {
      const result = await runTool("nonexistent", {}, context);

      expect(result.result.success).toBe(false);
      expect(result.result.error).toContain("Unknown tool");
      expect(result.executionRecord.status).toBe("failed");
    });

    it("returns awaiting_confirmation when confirmation required", async () => {
      vi.mocked(needsConfirmation).mockReturnValue({ required: true, reason: "High risk action", riskLevel: "high" });

      const result = await runTool("test_tool", {}, context, {
        skipGuardrails: true,
      });

      expect(result.needsConfirmation).toBe(true);
      expect(result.executionRecord.status).toBe("awaiting_confirmation");
    });

    it("returns failed when guardrails block", async () => {
      vi.mocked(checkGuardrails).mockResolvedValue({ allowed: false, reason: "Hourly limit exceeded" });

      const result = await runTool("test_tool", {}, context, {
        skipConfirmation: true,
      });

      expect(result.result.success).toBe(false);
      expect(result.result.error).toContain("Hourly limit");
      expect(result.executionRecord.status).toBe("failed");
    });

    it("handles execution errors", async () => {
      const tool = ToolRegistry.get("test_tool")!;
      tool.execute = vi.fn().mockRejectedValue(new Error("Execution failed"));

      const result = await runTool("test_tool", {}, context, {
        skipGuardrails: true,
        skipConfirmation: true,
      });

      expect(result.result.success).toBe(false);
      expect(result.result.error).toContain("Execution failed");
      expect(result.executionRecord.status).toBe("failed");
    });
  });

  describe("getExecutionRecord", () => {
    it("returns null for non-existent record", async () => {
      mockGet.mockResolvedValue({ exists: false, data: () => null });
      const record = await getExecutionRecord("user_1", "exec_1");
      expect(record).toBeNull();
    });

    it("returns record when exists", async () => {
      const mockRecord = { id: "exec_1", toolId: "test_tool", status: "completed" };
      mockGet.mockResolvedValue({ exists: true, data: () => mockRecord });
      const record = await getExecutionRecord("user_1", "exec_1");
      expect(record).toEqual(mockRecord);
    });
  });

  describe("cancelExecution", () => {
    it("cancels a pending execution", async () => {
      const mockRecord = { id: "exec_1", status: "awaiting_confirmation" };
      mockGet.mockResolvedValue({ exists: true, data: () => mockRecord });

      const result = await cancelExecution("user_1", "exec_1");
      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("returns false for completed execution", async () => {
      const mockRecord = { id: "exec_1", status: "completed" };
      mockGet.mockResolvedValue({ exists: true, data: () => mockRecord });

      const result = await cancelExecution("user_1", "exec_1");
      expect(result).toBe(false);
    });

    it("returns false for non-existent record", async () => {
      mockGet.mockResolvedValue({ exists: false, data: () => null });

      const result = await cancelExecution("user_1", "exec_1");
      expect(result).toBe(false);
    });
  });
});

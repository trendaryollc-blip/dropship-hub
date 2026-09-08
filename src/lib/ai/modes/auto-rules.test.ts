import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "../tools/registry";
import { evaluateAutoTriggers, getAutoModeStats } from "./auto-rules";
import { getAdminDB } from "@/lib/firebase-admin";

const mockSet = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn().mockResolvedValue({ exists: false, data: () => null });
const mockDocRef = { get: mockGet, set: mockSet, update: mockUpdate };

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({
    doc: vi.fn(() => mockDocRef),
  }),
}));

vi.mock("@/lib/jobs/client", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminDB).mockResolvedValue({
    doc: vi.fn(() => mockDocRef),
  } as never);
  
  // Register test tool
  ToolRegistry.register({
    id: "test_tool",
    name: "Test Tool",
    description: "A test tool",
    safetyLevel: "safe",
    category: "data",
    inputSchema: z.object({}).passthrough(),
    execute: vi.fn().mockResolvedValue({ success: true, data: {}, summary: "Done" }),
  });
});

describe("Auto Rules", () => {
  describe("evaluateAutoTriggers", () => {
    it("returns empty when no rules", async () => {
      mockGet.mockResolvedValue({ exists: true, data: () => ({ autoRules: [] }) });
      const result = await evaluateAutoTriggers("user_1");
      expect(result.triggered).toEqual([]);
      expect(result.skipped).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("returns empty when no prefs", async () => {
      mockGet.mockResolvedValue({ exists: false, data: () => null });
      const result = await evaluateAutoTriggers("user_1");
      expect(result.triggered).toEqual([]);
    });

    it("skips disabled rules", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          autoRules: [
            {
              id: "rule_1",
              toolId: "test_tool",
              enabled: false,
              trigger: "schedule",
              schedule: "hourly",
              params: {},
              lastRunAt: null,
              nextRunAt: null,
            },
          ],
        }),
      });

      const result = await evaluateAutoTriggers("user_1");
      expect(result.skipped).toContain("rule_1");
    });

    it("triggers enabled schedule rules", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          autoRules: [
            {
              id: "rule_1",
              toolId: "test_tool",
              enabled: true,
              trigger: "schedule",
              schedule: "6hours",
              params: {},
              lastRunAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
              nextRunAt: null,
            },
          ],
        }),
      });

      const result = await evaluateAutoTriggers("user_1");
      expect(result.triggered).toContain("rule_1");
    });

    it("handles execution errors", async () => {
      const tool = ToolRegistry.get("test_tool")!;
      tool.execute = vi.fn().mockRejectedValue(new Error("Execution failed"));

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          autoRules: [
            {
              id: "rule_1",
              toolId: "test_tool",
              enabled: true,
              trigger: "schedule",
              schedule: "6hours",
              params: {},
              lastRunAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
              nextRunAt: null,
            },
          ],
        }),
      });

      const result = await evaluateAutoTriggers("user_1");
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain("rule_1");
    });
  });

  describe("getAutoModeStats", () => {
    it("returns stats for user with no rules", async () => {
      mockGet.mockResolvedValue({ exists: false, data: () => null });
      const stats = await getAutoModeStats("user_1");
      expect(stats.totalRules).toBe(0);
      expect(stats.activeRules).toBe(0);
    });

    it("returns stats for user with rules", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          autoRules: [
            {
              id: "rule_1",
              enabled: true,
              lastRunAt: new Date().toISOString(),
            },
            {
              id: "rule_2",
              enabled: false,
              lastRunAt: null,
            },
          ],
        }),
      });

      const stats = await getAutoModeStats("user_1");
      expect(stats.totalRules).toBe(2);
      expect(stats.activeRules).toBe(1);
      expect(stats.lastRunAt).toBeDefined();
    });
  });
});

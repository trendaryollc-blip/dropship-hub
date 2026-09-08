import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "../tools/registry";
import { parseToolCalls, executeToolCalls } from "./executor";
import { runTool } from "./runner";
import type { ToolCall } from "../types";

vi.mock("./runner", () => ({
  runTool: vi.fn().mockResolvedValue({
    result: { success: true, data: { result: 42 }, summary: "Success" },
    executionRecord: { id: "exec_1", status: "completed" },
    needsConfirmation: false,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  
  // Register test tool
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

describe("Executor", () => {
  describe("parseToolCalls", () => {
    it("parses JSON block format", () => {
      const response = `
\`\`\`json
{
  "tool_calls": [
    {
      "tool": "test_tool",
      "input": { "key": "value" }
    }
  ]
}
\`\`\`
`;
      const calls = parseToolCalls(response);
      expect(calls.length).toBe(1);
      expect(calls[0].tool).toBe("test_tool");
      expect(calls[0].input).toEqual({ key: "value" });
    });

    it("parses inline JSON format", () => {
      const response = `{"tool_calls": [{"tool": "test_tool", "input": {}}]}`;
      const calls = parseToolCalls(response);
      expect(calls.length).toBe(1);
      expect(calls[0].tool).toBe("test_tool");
    });

    it("parses multiple tool calls", () => {
      const response = `
\`\`\`json
{
  "tool_calls": [
    { "tool": "test_tool", "input": { "a": 1 } },
    { "tool": "test_tool", "input": { "b": 2 } }
  ]
}
\`\`\`
`;
      const calls = parseToolCalls(response);
      expect(calls.length).toBe(2);
    });

    it("returns empty array for no tool calls", () => {
      const response = "Hello, how can I help you?";
      const calls = parseToolCalls(response);
      expect(calls.length).toBe(0);
    });

    it("handles malformed JSON gracefully", () => {
      const response = "```json\n{invalid json}\n```";
      const calls = parseToolCalls(response);
      expect(calls.length).toBe(0);
    });

    it("adds id to tool calls", () => {
      const response = `
\`\`\`json
{
  "tool_calls": [
    { "tool": "test_tool", "input": {} }
  ]
}
\`\`\`
`;
      const calls = parseToolCalls(response);
      expect(calls[0].id).toBeDefined();
      expect(calls[0].id).toMatch(/^call_/);
    });

    it("preserves existing id", () => {
      const response = `
\`\`\`json
{
  "tool_calls": [
    { "id": "my_id", "tool": "test_tool", "input": {} }
  ]
}
\`\`\`
`;
      const calls = parseToolCalls(response);
      expect(calls[0].id).toBe("my_id");
    });
  });

  describe("executeToolCalls", () => {
    it("executes tool calls successfully", async () => {
      const toolCalls: ToolCall[] = [
        { id: "call_1", tool: "test_tool", input: { key: "value" } },
      ];

      const result = await executeToolCalls(toolCalls, {
        uid: "user_1",
        executionId: "exec_1",
        trigger: "ai_chat",
        mode: "ai_assist",
      });

      expect(result.totalExecuted).toBe(1);
      expect(result.totalFailed).toBe(0);
      expect(result.results[0].result.success).toBe(true);
    });

    it("executes multiple tool calls sequentially", async () => {
      const toolCalls: ToolCall[] = [
        { id: "call_1", tool: "test_tool", input: { a: 1 } },
        { id: "call_2", tool: "test_tool", input: { b: 2 } },
      ];

      const result = await executeToolCalls(toolCalls, {
        uid: "user_1",
        executionId: "exec_1",
        trigger: "ai_chat",
        mode: "ai_assist",
      });

      expect(result.totalExecuted).toBe(2);
    });

    it("handles execution failures", async () => {
      vi.mocked(runTool).mockResolvedValueOnce({
        result: { success: false, data: null, summary: "Failed", error: "Error" },
        executionRecord: { id: "exec_1", status: "failed" } as any,
        needsConfirmation: false,
      });

      const toolCalls: ToolCall[] = [
        { id: "call_1", tool: "test_tool", input: {} },
      ];

      const result = await executeToolCalls(toolCalls, {
        uid: "user_1",
        executionId: "exec_1",
        trigger: "ai_chat",
        mode: "ai_assist",
      });

      expect(result.totalFailed).toBe(1);
    });

    it("handles pending confirmations", async () => {
      vi.mocked(runTool).mockResolvedValueOnce({
        result: { success: false, data: null, summary: "Awaiting", error: "confirmation_required" },
        executionRecord: { id: "exec_1", status: "awaiting_confirmation" } as any,
        needsConfirmation: true,
      });

      const toolCalls: ToolCall[] = [
        { id: "call_1", tool: "test_tool", input: {} },
      ];

      const result = await executeToolCalls(toolCalls, {
        uid: "user_1",
        executionId: "exec_1",
        trigger: "ai_chat",
        mode: "ai_assist",
      });

      expect(result.totalPendingConfirmation).toBe(1);
    });

    it("returns empty result for no tool calls", async () => {
      const result = await executeToolCalls([], {
        uid: "user_1",
        executionId: "exec_1",
        trigger: "ai_chat",
        mode: "ai_assist",
      });

      expect(result.totalExecuted).toBe(0);
      expect(result.summary).toContain("No actions taken");
    });
  });
});

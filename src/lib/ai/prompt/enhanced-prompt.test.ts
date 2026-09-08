import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "../tools/registry";
import { buildEnhancedPrompt, buildToolResultsContext, buildResponseInstructions } from "./enhanced-prompt";

// Register test tools
beforeEach(() => {
  vi.clearAllMocks();
  
  ToolRegistry.register({
    id: "test_tool",
    name: "Test Tool",
    description: "A test tool",
    safetyLevel: "safe",
    category: "data",
    inputSchema: z.object({}).passthrough(),
    execute: vi.fn(),
  });
});

describe("Enhanced Prompt", () => {
  describe("buildEnhancedPrompt", () => {
    it("includes base prompt", () => {
      const result = buildEnhancedPrompt({ basePrompt: "Base prompt." });
      expect(result).toContain("Base prompt.");
    });

    it("includes tool definitions when mode is ai_assist", () => {
      const result = buildEnhancedPrompt({
        basePrompt: "Base prompt.",
        modePreferences: { globalMode: "ai_assist" } as any,
      });
      expect(result).toContain("test_tool");
    });

    it("includes tool definitions when mode is auto", () => {
      const result = buildEnhancedPrompt({
        basePrompt: "Base prompt.",
        modePreferences: { globalMode: "auto" } as any,
      });
      expect(result).toContain("Auto");
    });

    it("excludes tools when mode is manual", () => {
      const result = buildEnhancedPrompt({
        basePrompt: "Base prompt.",
        modePreferences: { globalMode: "manual" } as any,
      });
      expect(result).toBe("Base prompt.");
    });

    it("excludes tools when includeTools is false", () => {
      const result = buildEnhancedPrompt({
        basePrompt: "Base prompt.",
        modePreferences: { globalMode: "ai_assist" } as any,
        includeTools: false,
      });
      expect(result).toBe("Base prompt.");
    });
  });

  describe("buildToolResultsContext", () => {
    it("returns empty string for empty results", () => {
      const result = buildToolResultsContext([]);
      expect(result).toBe("");
    });

    it("formats successful results", () => {
      const result = buildToolResultsContext([
        { toolId: "calculate_profit", summary: "Profit: $50", success: true },
      ]);
      expect(result).toContain("calculate_profit");
      expect(result).toContain("Profit: $50");
      expect(result).toContain("✅");
    });

    it("formats failed results", () => {
      const result = buildToolResultsContext([
        { toolId: "calculate_profit", summary: "Error occurred", success: false },
      ]);
      expect(result).toContain("❌");
    });

    it("formats multiple results", () => {
      const result = buildToolResultsContext([
        { toolId: "tool_1", summary: "Result 1", success: true },
        { toolId: "tool_2", summary: "Result 2", success: true },
      ]);
      expect(result).toContain("tool_1");
      expect(result).toContain("tool_2");
    });
  });

  describe("buildResponseInstructions", () => {
    it("returns empty string when no tool results and no pending", () => {
      const result = buildResponseInstructions(false, 0);
      expect(result).toBe("");
    });

    it("includes formatting instructions when tool results exist", () => {
      const result = buildResponseInstructions(true, 0);
      expect(result).toContain("markdown tables");
      expect(result).toContain("bullet points");
      expect(result).toContain("key metrics");
    });

    it("includes pending confirmation notice", () => {
      const result = buildResponseInstructions(false, 3);
      expect(result).toContain("3 actions awaiting");
      expect(result).toContain("confirm or cancel");
    });

    it("includes both when applicable", () => {
      const result = buildResponseInstructions(true, 2);
      expect(result).toContain("markdown tables");
      expect(result).toContain("2 actions awaiting");
    });
  });
});

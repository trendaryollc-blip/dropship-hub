import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "../tools/registry";
import { needsConfirmation, checkDollarThreshold, getConfirmationSummary } from "./confirmations";

// Register test tools with different safety levels
beforeEach(() => {
  vi.clearAllMocks();
  
  // Register tools with different safety levels
  ToolRegistry.register({
    id: "safe_tool",
    name: "Safe Tool",
    description: "A safe tool",
    safetyLevel: "safe",
    category: "data",
    inputSchema: z.object({}).passthrough(),
    execute: vi.fn().mockResolvedValue({ success: true }),
  });

  ToolRegistry.register({
    id: "moderate_tool",
    name: "Moderate Tool",
    description: "A moderate tool",
    safetyLevel: "moderate",
    category: "data",
    inputSchema: z.object({}).passthrough(),
    execute: vi.fn().mockResolvedValue({ success: true }),
  });

  ToolRegistry.register({
    id: "dangerous_tool",
    name: "Dangerous Tool",
    description: "A dangerous tool",
    safetyLevel: "dangerous",
    category: "data",
    inputSchema: z.object({}).passthrough(),
    execute: vi.fn().mockResolvedValue({ success: true }),
  });

  ToolRegistry.register({
    id: "calculate_profit",
    name: "Calculate Profit",
    description: "Calculates profit for a product",
    safetyLevel: "safe",
    category: "financial",
    inputSchema: z.object({}).passthrough(),
    execute: vi.fn().mockResolvedValue({ success: true }),
  });
});

describe("Confirmations", () => {
  describe("needsConfirmation", () => {
    describe("Level 0 - Advisory", () => {
      it("always requires confirmation", () => {
        const result = needsConfirmation("safe_tool", {}, 0);
        expect(result.required).toBe(true);
        expect(result.reason).toContain("Advisory");
      });
    });

    describe("Level 1 - Ask Every Time", () => {
      it("always requires confirmation for safe tools", () => {
        const result = needsConfirmation("safe_tool", {}, 1);
        expect(result.required).toBe(true);
        expect(result.reason).toContain("Ask Every Time");
      });

      it("always requires confirmation for moderate tools", () => {
        const result = needsConfirmation("moderate_tool", {}, 1);
        expect(result.required).toBe(true);
      });

      it("always requires confirmation for dangerous tools", () => {
        const result = needsConfirmation("dangerous_tool", {}, 1);
        expect(result.required).toBe(true);
      });
    });

    describe("Level 2 - Smart Auto", () => {
      it("auto-executes safe tools", () => {
        const result = needsConfirmation("safe_tool", {}, 2);
        expect(result.required).toBe(false);
        expect(result.reason).toContain("Safe tool");
      });

      it("requires confirmation for moderate tools", () => {
        const result = needsConfirmation("moderate_tool", {}, 2);
        expect(result.required).toBe(true);
        expect(result.reason).toContain("moderate");
      });

      it("requires confirmation for dangerous tools", () => {
        const result = needsConfirmation("dangerous_tool", {}, 2);
        expect(result.required).toBe(true);
      });
    });

    describe("Level 3 - Mostly Auto", () => {
      it("auto-executes safe tools", () => {
        const result = needsConfirmation("safe_tool", {}, 3);
        expect(result.required).toBe(false);
      });

      it("auto-executes moderate tools", () => {
        const result = needsConfirmation("moderate_tool", {}, 3);
        expect(result.required).toBe(false);
      });

      it("requires confirmation for dangerous tools", () => {
        const result = needsConfirmation("dangerous_tool", {}, 3);
        expect(result.required).toBe(true);
      });
    });

    describe("Level 4 - Full Auto", () => {
      it("auto-executes safe tools", () => {
        const result = needsConfirmation("safe_tool", {}, 4);
        expect(result.required).toBe(false);
      });

      it("auto-executes moderate tools", () => {
        const result = needsConfirmation("moderate_tool", {}, 4);
        expect(result.required).toBe(false);
      });

      it("still requires confirmation for dangerous tools", () => {
        const result = needsConfirmation("dangerous_tool", {}, 4);
        expect(result.required).toBe(true);
        expect(result.reason).toContain("Full Auto");
      });
    });

    describe("Unknown tool", () => {
      it("requires confirmation for unknown tools", () => {
        const result = needsConfirmation("unknown_tool", {}, 4);
        expect(result.required).toBe(true);
        expect(result.reason).toContain("Unknown tool");
      });
    });
  });

  describe("checkDollarThreshold", () => {
    it("returns false when below threshold", () => {
      const result = checkDollarThreshold({ cost: 50 }, 100);
      expect(result.exceeds).toBe(false);
      expect(result.estimatedDollars).toBe(50);
    });

    it("returns true when above threshold", () => {
      const result = checkDollarThreshold({ cost: 150 }, 100);
      expect(result.exceeds).toBe(true);
      expect(result.estimatedDollars).toBe(150);
    });

    it("extracts max dollar from multiple fields", () => {
      const result = checkDollarThreshold({ cost: 50, price: 75 }, 100);
      expect(result.estimatedDollars).toBe(75);
    });

    it("handles zero dollar amounts", () => {
      const result = checkDollarThreshold({ cost: 0 }, 100);
      expect(result.exceeds).toBe(false);
      expect(result.estimatedDollars).toBe(0);
    });

    it("handles missing dollar fields", () => {
      const result = checkDollarThreshold({ name: "test" }, 100);
      expect(result.exceeds).toBe(false);
      expect(result.estimatedDollars).toBe(0);
    });

    it("extracts from orderTotal field", () => {
      const result = checkDollarThreshold({ orderTotal: 200 }, 100);
      expect(result.exceeds).toBe(true);
      expect(result.estimatedDollars).toBe(200);
    });

    it("extracts from spend field", () => {
      const result = checkDollarThreshold({ spend: 150 }, 100);
      expect(result.exceeds).toBe(true);
    });

    it("extracts from revenue field", () => {
      const result = checkDollarThreshold({ revenue: 180 }, 100);
      expect(result.exceeds).toBe(true);
    });
  });

  describe("getConfirmationSummary", () => {
    it("returns tool name and description", () => {
      const result = getConfirmationSummary("calculate_profit", { cost: 10, price: 25 });
      expect(result.toolName).toBe("Calculate Profit");
      expect(result.description).toContain("Calculates profit");
      expect(result.inputSummary).toContain("cost");
    });

    it("handles unknown tool", () => {
      const result = getConfirmationSummary("unknown_tool", {});
      expect(result.toolName).toBe("unknown_tool");
      expect(result.description).toBe("Execute action");
    });

    it("summarizes string inputs", () => {
      const result = getConfirmationSummary("safe_tool", { name: "Test Product" });
      expect(result.inputSummary).toContain("name");
      expect(result.inputSummary).toContain("Test Product");
    });

    it("summarizes long string inputs with truncation", () => {
      const longString = "a".repeat(150);
      const result = getConfirmationSummary("safe_tool", { description: longString });
      expect(result.inputSummary).toContain("...");
    });

    it("summarizes object inputs", () => {
      const result = getConfirmationSummary("safe_tool", { items: [1, 2, 3] });
      expect(result.inputSummary).toContain("[object]");
    });
  });
});

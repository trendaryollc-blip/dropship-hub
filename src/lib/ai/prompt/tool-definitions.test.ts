import { describe, it, expect, beforeAll } from "vitest";
import { generateToolDefinitionsPrompt, generateCompactToolList, getToolSchemasAsJSON } from "./tool-definitions";
import { registerAllTools } from "../tools/index";

beforeAll(() => {
  registerAllTools();
});

describe("Tool Definitions", () => {
  describe("generateToolDefinitionsPrompt", () => {
    it("generates a prompt with tool definitions", () => {
      const prompt = generateToolDefinitionsPrompt();
      expect(prompt).toContain("## Available Tools");
      expect(prompt).toContain("tool_calls");
      expect(prompt).toContain("Important Rules");
    });

    it("includes tool categories", () => {
      const prompt = generateToolDefinitionsPrompt();
      expect(prompt).toContain("Financial Tools");
      expect(prompt).toContain("Pricing Tools");
    });

    it("includes safety indicators", () => {
      const prompt = generateToolDefinitionsPrompt();
      expect(prompt).toContain("🟢"); // safe
    });
  });

  describe("generateCompactToolList", () => {
    it("generates a compact list of tools", () => {
      const list = generateCompactToolList();
      expect(list).toContain("🟢");
      expect(list).toContain("calculate_profit");
    });

    it("returns one line per tool", () => {
      const list = generateCompactToolList();
      const lines = list.split("\n").filter((l) => l.trim());
      expect(lines.length).toBeGreaterThan(10);
    });
  });

  describe("getToolSchemasAsJSON", () => {
    it("returns array of function schemas", () => {
      const schemas = getToolSchemasAsJSON();
      expect(Array.isArray(schemas)).toBe(true);
      expect(schemas.length).toBeGreaterThan(0);
    });

    it("each schema has correct structure", () => {
      const schemas = getToolSchemasAsJSON();
      schemas.forEach((schema) => {
        expect(schema.type).toBe("function");
        expect(schema.function).toHaveProperty("name");
        expect(schema.function).toHaveProperty("description");
        expect(schema.function).toHaveProperty("parameters");
        expect(schema.function.parameters).toHaveProperty("type", "object");
        expect(schema.function.parameters).toHaveProperty("properties");
        expect(schema.function.parameters).toHaveProperty("required");
      });
    });

    it("includes all registered tools", () => {
      const schemas = getToolSchemasAsJSON();
      const names = schemas.map((s) => s.function.name);
      expect(names).toContain("calculate_profit");
      expect(names).toContain("search_products");
      expect(names).toContain("place_order");
    });
  });
});

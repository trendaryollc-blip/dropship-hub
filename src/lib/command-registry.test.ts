import { describe, it, expect } from "vitest";
import { commands, searchCommands } from "./command-registry";

describe("command-registry", () => {
  it("has commands defined", () => {
    expect(commands.length).toBeGreaterThan(0);
  });

  it("each command has required fields", () => {
    commands.forEach((cmd) => {
      expect(cmd.id).toBeDefined();
      expect(cmd.label).toBeDefined();
      expect(cmd.icon).toBeDefined();
      expect(cmd.category).toBeDefined();
    });
  });

  it("has commands in all categories", () => {
    const categories = new Set(commands.map((c) => c.category));
    expect(categories.has("pages")).toBe(true);
    expect(categories.has("actions")).toBe(true);
    expect(categories.has("settings")).toBe(true);
  });

  it("searchCommands returns all for empty query", () => {
    expect(searchCommands("")).toEqual(commands);
  });

  it("searchCommands filters by label", () => {
    const results = searchCommands("dashboard");
    expect(results.some((c) => c.id === "dashboard")).toBe(true);
  });

  it("searchCommands filters by description", () => {
    const results = searchCommands("winning products");
    expect(results.some((c) => c.id === "search-products")).toBe(true);
  });

  it("searchCommands filters by keywords", () => {
    const results = searchCommands("margin");
    expect(results.some((c) => c.id === "calculator")).toBe(true);
  });

  it("searchCommands is case-insensitive", () => {
    const results = searchCommands("DASHBOARD");
    expect(results.some((c) => c.id === "dashboard")).toBe(true);
  });

  it("searchCommands returns empty for no match", () => {
    const results = searchCommands("xyznonexistent");
    expect(results.length).toBe(0);
  });
});

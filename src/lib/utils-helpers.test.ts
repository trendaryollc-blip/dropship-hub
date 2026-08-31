import { describe, it, expect } from "vitest";
import { safeNum, safeStr } from "./utils-helpers";

describe("safeNum", () => {
  it("returns number if valid", () => {
    expect(safeNum(42)).toBe(42);
  });

  it("parses string numbers", () => {
    expect(safeNum("3.14")).toBe(3.14);
  });

  it("returns fallback for NaN", () => {
    expect(safeNum(NaN)).toBe(0);
    expect(safeNum(NaN, 99)).toBe(99);
  });

  it("returns fallback for non-numeric strings", () => {
    expect(safeNum("abc")).toBe(0);
    expect(safeNum("abc", -1)).toBe(-1);
  });

  it("returns fallback for null/undefined", () => {
    expect(safeNum(null)).toBe(0);
    expect(safeNum(undefined)).toBe(0);
  });

  it("handles boolean values", () => {
    expect(safeNum(true)).toBe(0);
    expect(safeNum(false)).toBe(0);
  });
});

describe("safeStr", () => {
  it("returns string if valid", () => {
    expect(safeStr("hello")).toBe("hello");
  });

  it("converts number to string", () => {
    expect(safeStr(42)).toBe("42");
  });

  it("returns fallback for null/undefined", () => {
    expect(safeStr(null)).toBe("");
    expect(safeStr(undefined)).toBe("");
    expect(safeStr(null, "default")).toBe("default");
  });

  it("converts objects to string", () => {
    expect(safeStr({ a: 1 })).toBe("[object Object]");
  });
});

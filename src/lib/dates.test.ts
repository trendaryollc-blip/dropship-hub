import { describe, it, expect } from "vitest";
import { toDate, formatDate, formatDateTime, toIsoString } from "./dates";

describe("toDate", () => {
  it("parses ISO strings", () => {
    const d = toDate("2024-01-15T00:00:00Z");
    expect(d).toBeInstanceOf(Date);
    expect(d?.toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });

  it("returns null for empty, whitespace, or invalid strings", () => {
    expect(toDate("")).toBeNull();
    expect(toDate("   ")).toBeNull();
    expect(toDate("not-a-date")).toBeNull();
  });

  it("returns null for null and undefined", () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
  });

  it("accepts epoch milliseconds and Date instances", () => {
    expect(toDate(1700000000000)?.getTime()).toBe(1700000000000);
    const now = new Date();
    expect(toDate(now)).toBe(now);
    expect(toDate(new Date("invalid"))).toBeNull();
  });

  it("parses serialized Firestore Timestamp objects", () => {
    const serialized = { type: "firestore/timestamp/1.0", seconds: 1700000000, nanoseconds: 123000000 };
    expect(toDate(serialized)?.getTime()).toBe(1700000000 * 1000);
  });

  it("uses toDate() on live Firestore Timestamp instances", () => {
    const stamp = { toDate: () => new Date("2024-06-01T12:00:00Z") };
    expect(toDate(stamp)?.toISOString()).toBe("2024-06-01T12:00:00.000Z");
  });

  it("returns null when toDate() throws or returns an invalid date", () => {
    expect(toDate({ toDate: () => { throw new Error("boom"); } })).toBeNull();
    expect(toDate({ toDate: () => new Date("invalid") })).toBeNull();
  });
});

describe("formatDate / formatDateTime", () => {
  it("formats valid values using the same locale rules as Date", () => {
    expect(formatDate("2024-01-15T00:00:00Z")).toBe(new Date("2024-01-15T00:00:00Z").toLocaleDateString());
    expect(formatDateTime({ seconds: 1700000000 })).toBe(new Date(1700000000 * 1000).toLocaleString());
  });

  it("returns empty string for invalid input instead of 'Invalid Date'", () => {
    expect(formatDate("nope")).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDateTime(null)).toBe("");
  });
});

describe("toIsoString", () => {
  it("normalizes strings and serialized timestamps to ISO", () => {
    expect(toIsoString("2024-01-15T00:00:00Z")).toBe("2024-01-15T00:00:00.000Z");
    expect(toIsoString({ seconds: 1700000000, nanoseconds: 0 })).toBe(new Date(1700000000000).toISOString());
    expect(toIsoString(undefined)).toBe("");
  });
});
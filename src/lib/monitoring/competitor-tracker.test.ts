import { describe, it, expect, vi, beforeEach } from "vitest";
import { findCompetitorUndercuts } from "./competitor-tracker";
import type { CompetitorSnapshot } from "./types";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe("findCompetitorUndercuts", () => {
  it("returns empty when no snapshots", () => {
    const result = findCompetitorUndercuts(30, []);
    expect(result).toEqual([]);
  });

  it("returns empty when no cheaper competitors", () => {
    const snapshots: CompetitorSnapshot[] = [
      { url: "https://a.com", price: 35, inStock: true, scrapedAt: new Date().toISOString() },
      { url: "https://b.com", price: 40, inStock: true, scrapedAt: new Date().toISOString() },
    ];
    const result = findCompetitorUndercuts(30, snapshots);
    expect(result).toEqual([]);
  });

  it("finds cheaper in-stock competitors", () => {
    const snapshots: CompetitorSnapshot[] = [
      { url: "https://a.com", price: 25, inStock: true, scrapedAt: new Date().toISOString() },
      { url: "https://b.com", price: 35, inStock: true, scrapedAt: new Date().toISOString() },
    ];
    const result = findCompetitorUndercuts(30, snapshots);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://a.com");
  });

  it("ignores out-of-stock competitors even if cheaper", () => {
    const snapshots: CompetitorSnapshot[] = [
      { url: "https://a.com", price: 20, inStock: false, scrapedAt: new Date().toISOString() },
    ];
    const result = findCompetitorUndercuts(30, snapshots);
    expect(result).toEqual([]);
  });

  it("ignores competitors with null price", () => {
    const snapshots: CompetitorSnapshot[] = [
      { url: "https://a.com", price: null, inStock: true, scrapedAt: new Date().toISOString() },
    ];
    const result = findCompetitorUndercuts(30, snapshots);
    expect(result).toEqual([]);
  });

  it("finds multiple undercuts", () => {
    const snapshots: CompetitorSnapshot[] = [
      { url: "https://a.com", price: 20, inStock: true, scrapedAt: new Date().toISOString() },
      { url: "https://b.com", price: 25, inStock: true, scrapedAt: new Date().toISOString() },
      { url: "https://c.com", price: 35, inStock: true, scrapedAt: new Date().toISOString() },
    ];
    const result = findCompetitorUndercuts(30, snapshots);
    expect(result).toHaveLength(2);
  });

  it("treats equal price as not an undercut", () => {
    const snapshots: CompetitorSnapshot[] = [
      { url: "https://a.com", price: 30, inStock: true, scrapedAt: new Date().toISOString() },
    ];
    const result = findCompetitorUndercuts(30, snapshots);
    expect(result).toEqual([]);
  });
});

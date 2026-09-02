import { describe, it, expect, vi, beforeEach } from "vitest";
import { findCompetitorUndercuts } from "@/lib/monitoring/competitor-tracker";
import type { CompetitorSnapshot } from "@/lib/monitoring/types";

describe("competitor-tracker", () => {
  describe("findCompetitorUndercuts", () => {
    it("returns empty for no competitors", () => {
      const result = findCompetitorUndercuts(50, []);
      expect(result).toEqual([]);
    });

    it("returns empty when no competitor is cheaper", () => {
      const snapshots: CompetitorSnapshot[] = [
        { url: "https://competitor1.com", price: 60, inStock: true, scrapedAt: "" },
        { url: "https://competitor2.com", price: 55, inStock: true, scrapedAt: "" },
      ];
      const result = findCompetitorUndercuts(50, snapshots);
      expect(result).toEqual([]);
    });

    it("finds competitors with lower prices", () => {
      const snapshots: CompetitorSnapshot[] = [
        { url: "https://competitor1.com", price: 45, inStock: true, scrapedAt: "" },
        { url: "https://competitor2.com", price: 55, inStock: true, scrapedAt: "" },
      ];
      const result = findCompetitorUndercuts(50, snapshots);
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe("https://competitor1.com");
    });

    it("ignores out-of-stock competitors", () => {
      const snapshots: CompetitorSnapshot[] = [
        { url: "https://competitor1.com", price: 40, inStock: false, scrapedAt: "" },
      ];
      const result = findCompetitorUndercuts(50, snapshots);
      expect(result).toEqual([]);
    });

    it("ignores competitors with null prices", () => {
      const snapshots: CompetitorSnapshot[] = [
        { url: "https://competitor1.com", price: null, inStock: true, scrapedAt: "" },
      ];
      const result = findCompetitorUndercuts(50, snapshots);
      expect(result).toEqual([]);
    });

    it("finds multiple undercuts", () => {
      const snapshots: CompetitorSnapshot[] = [
        { url: "https://a.com", price: 40, inStock: true, scrapedAt: "" },
        { url: "https://b.com", price: 45, inStock: true, scrapedAt: "" },
        { url: "https://c.com", price: 55, inStock: true, scrapedAt: "" },
      ];
      const result = findCompetitorUndercuts(50, snapshots);
      expect(result).toHaveLength(2);
    });

    it("handles equal prices correctly", () => {
      const snapshots: CompetitorSnapshot[] = [
        { url: "https://competitor1.com", price: 50, inStock: true, scrapedAt: "" },
      ];
      const result = findCompetitorUndercuts(50, snapshots);
      expect(result).toEqual([]);
    });
  });
});

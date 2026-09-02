import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculatePriceStats } from "@/lib/monitoring/price-history";
import type { PriceHistoryEntry } from "@/lib/monitoring/types";

describe("price-history", () => {
  describe("calculatePriceStats", () => {
    it("returns zeros for empty history", () => {
      const stats = calculatePriceStats([]);
      expect(stats).toEqual({ current: 0, lowest: 0, highest: 0, avgChangePercent: 0, volatility: 0 });
    });

    it("calculates stats for single entry", () => {
      const history: PriceHistoryEntry[] = [{ date: "2026-01-01", price: 29.99 }];
      const stats = calculatePriceStats(history);
      expect(stats.current).toBe(29.99);
      expect(stats.lowest).toBe(29.99);
      expect(stats.highest).toBe(29.99);
      expect(stats.avgChangePercent).toBe(0);
      expect(stats.volatility).toBe(0);
    });

    it("calculates stats for multiple entries", () => {
      const history: PriceHistoryEntry[] = [
        { date: "2026-01-01", price: 100 },
        { date: "2026-01-02", price: 110 },
        { date: "2026-01-03", price: 105 },
      ];
      const stats = calculatePriceStats(history);
      expect(stats.current).toBe(105);
      expect(stats.lowest).toBe(100);
      expect(stats.highest).toBe(110);
      expect(stats.avgChangePercent).toBeCloseTo(2.44, 0);
    });

    it("handles price drops correctly", () => {
      const history: PriceHistoryEntry[] = [
        { date: "2026-01-01", price: 200 },
        { date: "2026-01-02", price: 150 },
      ];
      const stats = calculatePriceStats(history);
      expect(stats.current).toBe(150);
      expect(stats.lowest).toBe(150);
      expect(stats.highest).toBe(200);
      expect(stats.avgChangePercent).toBeCloseTo(-25, 0);
    });

    it("handles zero prices gracefully", () => {
      const history: PriceHistoryEntry[] = [
        { date: "2026-01-01", price: 0 },
        { date: "2026-01-02", price: 100 },
      ];
      const stats = calculatePriceStats(history);
      expect(stats.current).toBe(100);
      expect(stats.highest).toBe(100);
    });

    it("filters out zero prices for current calculation", () => {
      const history: PriceHistoryEntry[] = [
        { date: "2026-01-01", price: 100 },
        { date: "2026-01-02", price: 0 },
        { date: "2026-01-03", price: 110 },
      ];
      const stats = calculatePriceStats(history);
      expect(stats.current).toBe(110);
    });

    it("calculates volatility correctly", () => {
      const history: PriceHistoryEntry[] = [
        { date: "2026-01-01", price: 100 },
        { date: "2026-01-02", price: 100 },
        { date: "2026-01-03", price: 100 },
      ];
      const stats = calculatePriceStats(history);
      expect(stats.volatility).toBe(0);
    });

    it("handles large price swings", () => {
      const history: PriceHistoryEntry[] = [
        { date: "2026-01-01", price: 10 },
        { date: "2026-01-02", price: 100 },
      ];
      const stats = calculatePriceStats(history);
      expect(stats.volatility).toBeGreaterThan(0);
    });
  });
});

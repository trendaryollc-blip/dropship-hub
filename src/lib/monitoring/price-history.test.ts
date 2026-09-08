import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculatePriceStats } from "./price-history";
import type { PriceHistoryEntry } from "./types";

describe("calculatePriceStats", () => {
  it("returns zeros for empty history", () => {
    const result = calculatePriceStats([]);
    expect(result.current).toBe(0);
    expect(result.lowest).toBe(0);
    expect(result.highest).toBe(0);
    expect(result.avgChangePercent).toBe(0);
    expect(result.volatility).toBe(0);
  });

  it("returns zeros for history with all zero prices", () => {
    const history: PriceHistoryEntry[] = [
      { date: "2025-01-01", price: 0 },
      { date: "2025-01-02", price: 0 },
    ];
    const result = calculatePriceStats(history);
    expect(result.current).toBe(0);
  });

  it("calculates correct current price (last entry)", () => {
    const history: PriceHistoryEntry[] = [
      { date: "2025-01-01", price: 20 },
      { date: "2025-01-02", price: 25 },
      { date: "2025-01-03", price: 30 },
    ];
    const result = calculatePriceStats(history);
    expect(result.current).toBe(30);
  });

  it("calculates correct lowest price", () => {
    const history: PriceHistoryEntry[] = [
      { date: "2025-01-01", price: 25 },
      { date: "2025-01-02", price: 15 },
      { date: "2025-01-03", price: 30 },
    ];
    const result = calculatePriceStats(history);
    expect(result.lowest).toBe(15);
  });

  it("calculates correct highest price", () => {
    const history: PriceHistoryEntry[] = [
      { date: "2025-01-01", price: 25 },
      { date: "2025-01-02", price: 40 },
      { date: "2025-01-03", price: 30 },
    ];
    const result = calculatePriceStats(history);
    expect(result.highest).toBe(40);
  });

  it("calculates average change percent for increasing prices", () => {
    const history: PriceHistoryEntry[] = [
      { date: "2025-01-01", price: 100 },
      { date: "2025-01-02", price: 110 },
      { date: "2025-01-03", price: 121 },
    ];
    const result = calculatePriceStats(history);
    expect(result.avgChangePercent).toBeCloseTo(10, 0);
  });

  it("calculates zero avg change for stable prices", () => {
    const history: PriceHistoryEntry[] = [
      { date: "2025-01-01", price: 25 },
      { date: "2025-01-02", price: 25 },
      { date: "2025-01-03", price: 25 },
    ];
    const result = calculatePriceStats(history);
    expect(result.avgChangePercent).toBe(0);
  });

  it("calculates volatility for varying prices", () => {
    const stable: PriceHistoryEntry[] = [
      { date: "2025-01-01", price: 25 },
      { date: "2025-01-02", price: 25 },
      { date: "2025-01-03", price: 25 },
    ];
    const volatile: PriceHistoryEntry[] = [
      { date: "2025-01-01", price: 10 },
      { date: "2025-01-02", price: 50 },
      { date: "2025-01-03", price: 15 },
    ];
    expect(calculatePriceStats(stable).volatility).toBe(0);
    expect(calculatePriceStats(volatile).volatility).toBeGreaterThan(0);
  });

  it("handles single entry", () => {
    const history: PriceHistoryEntry[] = [
      { date: "2025-01-01", price: 25 },
    ];
    const result = calculatePriceStats(history);
    expect(result.current).toBe(25);
    expect(result.lowest).toBe(25);
    expect(result.highest).toBe(25);
    expect(result.avgChangePercent).toBe(0);
  });

  it("filters out zero prices", () => {
    const history: PriceHistoryEntry[] = [
      { date: "2025-01-01", price: 0 },
      { date: "2025-01-02", price: 25 },
      { date: "2025-01-03", price: 30 },
    ];
    const result = calculatePriceStats(history);
    expect(result.current).toBe(30);
    expect(result.lowest).toBe(25);
  });
});

import { describe, it, expect } from "vitest";
import { computeMetrics } from "./base";

describe("computeMetrics", () => {
  it("calculates ROAS correctly", () => {
    const result = computeMetrics({ impressions: 1000, clicks: 50, conversions: 5, spend: 100, revenue: 500 });
    expect(result.roas).toBe(5);
  });

  it("calculates CPC correctly", () => {
    const result = computeMetrics({ impressions: 1000, clicks: 50, conversions: 5, spend: 100, revenue: 500 });
    expect(result.cpc).toBe(2);
  });

  it("calculates CTR correctly", () => {
    const result = computeMetrics({ impressions: 1000, clicks: 50, conversions: 5, spend: 100, revenue: 500 });
    expect(result.ctr).toBe(5);
  });

  it("calculates conversion rate correctly", () => {
    const result = computeMetrics({ impressions: 1000, clicks: 50, conversions: 5, spend: 100, revenue: 500 });
    expect(result.conversionRate).toBe(10);
  });

  it("returns 0 for all rates when clicks are 0", () => {
    const result = computeMetrics({ impressions: 1000, clicks: 0, conversions: 0, spend: 100, revenue: 0 });
    expect(result.roas).toBe(0);
    expect(result.cpc).toBe(0);
    expect(result.conversionRate).toBe(0);
  });

  it("returns 0 for CTR when impressions are 0", () => {
    const result = computeMetrics({ impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
    expect(result.ctr).toBe(0);
    expect(result.roas).toBe(0);
  });
});

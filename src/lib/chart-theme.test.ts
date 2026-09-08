import { describe, it, expect, vi, beforeEach } from "vitest";
import { getChartColors, chartTooltipStyle } from "./chart-theme";

describe("chart-theme", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("getChartColors returns default colors on server", () => {
    // Server-side (no window)
    const colors = getChartColors();
    expect(colors.accent).toBeDefined();
    expect(colors.success).toBeDefined();
  });

  it("chartTooltipStyle has required properties", () => {
    expect(chartTooltipStyle.contentStyle).toBeDefined();
    expect(chartTooltipStyle.cursor).toBeDefined();
    expect(chartTooltipStyle.contentStyle.borderRadius).toBe("12px");
  });

  it("chartTooltipStyle has backdrop filter", () => {
    expect(chartTooltipStyle.contentStyle.backdropFilter).toBe("blur(12px)");
  });
});

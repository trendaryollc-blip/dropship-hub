import { describe, it, expect } from "vitest";
import { defaultLayout, layoutPresets } from "./BentoLayoutPresets";

describe("BentoLayoutPresets", () => {
  it("has a default layout with all section IDs", () => {
    const sectionIds = [
      "hero", "kpi", "daily-pick", "intelligence", "revenue",
      "niches", "trending", "heatmap", "calculator", "suppliers",
      "digest", "mission",
    ];
    expect(defaultLayout.length).toBe(sectionIds.length);
    sectionIds.forEach((id) => {
      expect(defaultLayout.find((i) => i.id === id)).toBeDefined();
    });
  });

  it("has 4 layout presets", () => {
    expect(layoutPresets.length).toBe(4);
  });

  it("each preset has a unique id", () => {
    const ids = layoutPresets.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each preset layout has the same number of items as default", () => {
    layoutPresets.forEach((preset) => {
      expect(preset.layout.length).toBe(defaultLayout.length);
    });
  });

  it("preset items have valid colSpan values", () => {
    layoutPresets.forEach((preset) => {
      preset.layout.forEach((item) => {
        expect([1, 2, 3, 4]).toContain(item.colSpan);
      });
    });
  });

  it("preset items have valid rowSpan values", () => {
    layoutPresets.forEach((preset) => {
      preset.layout.forEach((item) => {
        expect([1, 2]).toContain(item.rowSpan);
      });
    });
  });
});

import { describe, it, expect } from "vitest";
import { themes, themeOrder, type Theme } from "./themes";

describe("themes", () => {
  it("has all themes from themeOrder", () => {
    for (const name of themeOrder) {
      expect(themes[name]).toBeDefined();
      expect(themes[name].name).toBe(name);
    }
  });

  it("has 12 themes", () => {
    expect(Object.keys(themes)).toHaveLength(12);
  });

  it("themeOrder has 12 themes", () => {
    expect(themeOrder).toHaveLength(12);
  });

  it("each theme has required properties", () => {
    for (const theme of Object.values(themes)) {
      expect(theme.label).toBeTruthy();
      expect(theme.background).toBeTruthy();
      expect(theme.foreground).toBeTruthy();
      expect(theme.surface).toBeTruthy();
      expect(theme.accent).toBeTruthy();
      expect(theme.sidebar).toBeTruthy();
      expect(theme.muted).toBeTruthy();
      expect(theme.success).toBeTruthy();
      expect(theme.warning).toBeTruthy();
      expect(theme.danger).toBeTruthy();
      expect(theme.glassBg).toBeTruthy();
      expect(theme.glassBorder).toBeTruthy();
      expect(theme.gradientStart).toBeTruthy();
      expect(theme.gradientMid).toBeTruthy();
      expect(theme.gradientEnd).toBeTruthy();
      expect(theme.glowColor).toBeTruthy();
      expect(theme.swatch).toHaveLength(3);
    }
  });

  it("all theme names are unique", () => {
    const names = Object.values(themes).map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("all swatches have 3 colors", () => {
    for (const theme of Object.values(themes)) {
      expect(theme.swatch).toHaveLength(3);
    }
  });
});

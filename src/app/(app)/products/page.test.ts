import { describe, it, expect } from "vitest";
import { matchProductByName } from "@/lib/search/match-product";

const results = [
  { id: "a1", title: "Wireless Earbuds Pro", price: 20, image: null, link: "#", source: "amazon" },
  { id: "b2", title: "LED Strip Lights 5M Led Bl Rgb", price: 8, image: null, link: "#", source: "amazon" },
  { id: "c3", title: "Phone Case", price: 5, image: null, link: "#", source: "aliexpress" },
];

describe("matchProductByName", () => {
  it("matches an exact normalized title", () => {
    expect(matchProductByName(results, "Wireless Earbuds Pro")).toBe("a1");
  });

  it("case-insensitively trims whitespace", () => {
    expect(matchProductByName(results, "  led strip lights 5m led bl ")).toBe("b2");
  });

  it("matches when either side is a prefix (dashboard truncation)", () => {
    expect(matchProductByName(results, "Led Strip Lights 5M Led Bl...")).toBe("b2");
    expect(matchProductByName(results, "Wireless")).toBe("a1");
  });

  it("strips the '...' ellipsis suffix", () => {
    expect(matchProductByName(results, "Phone Case...")).toBe("c3");
  });

  it("returns null for unknown names", () => {
    expect(matchProductByName(results, "Does Not Exist")).toBeNull();
  });

  it("returns null for empty names", () => {
    expect(matchProductByName(results, "")).toBeNull();
    expect(matchProductByName(results, "...")).toBeNull();
  });
});
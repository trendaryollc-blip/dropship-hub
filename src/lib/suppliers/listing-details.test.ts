import { describe, it, expect } from "vitest";
import {
  extractMoq,
  extractShippingDays,
  extractYearsInBusiness,
  parseListingDetails,
} from "./listing-details";

describe("listing detail extraction", () => {
  it("extracts MOQ from explicit phrasings", () => {
    expect(extractMoq("MOQ: 10 pieces")).toBe(10);
    expect(extractMoq("Min. Order: 50")).toBe(50);
    expect(extractMoq("Minimum order 100 units")).toBe(100);
    expect(extractMoq("order at least 25")).toBe(25);
  });

  it("returns undefined for MOQ when absent", () => {
    expect(extractMoq("Wireless earbuds bluetooth 5.0")).toBeUndefined();
    expect(extractMoq("MOQ: many")).toBeUndefined();
  });

  it("extracts the upper bound of a shipping window", () => {
    expect(extractShippingDays("Ships in 3-7 days")).toBe(7);
    expect(extractShippingDays("Delivery in 5 days")).toBe(5);
    expect(extractShippingDays("10-15 days delivery")).toBe(15);
  });

  it("returns undefined for shipping when absent or implausible", () => {
    expect(extractShippingDays("Great product")).toBeUndefined();
    expect(extractShippingDays("Ships in 999 days")).toBeUndefined();
  });

  it("derives years in business only from an explicit since/founded year", () => {
    expect(extractYearsInBusiness("Established since 2005", 2026)).toBe(21);
    expect(extractYearsInBusiness("Founded in 1990", 2026)).toBe(36);
    expect(extractYearsInBusiness("5 years warranty", 2026)).toBeUndefined();
    expect(extractYearsInBusiness("Since 2099", 2026)).toBeUndefined();
  });

  it("parses all details conservatively, omitting absent fields", () => {
    expect(parseListingDetails("MOQ: 10, Ships in 3-7 days", 2026)).toEqual({
      moq: 10,
      shippingDays: 7,
    });
    expect(parseListingDetails("just a title", 2026)).toEqual({});
  });
});

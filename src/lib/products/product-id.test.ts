import { describe, it, expect } from "vitest";
import { stableProductId, sanitizeDocId } from "./product-id";

describe("stableProductId", () => {
  it("prefers an explicit id", () => {
    expect(stableProductId({ id: "abc123", source: "amazon", link: "https://x" })).toBe("abc123");
  });

  it("falls back to a platform productId", () => {
    expect(stableProductId({ productId: "B0ASIN", title: "Widget" })).toBe("B0ASIN");
  });

  it("is deterministic for the same source + link", () => {
    const a = stableProductId({ source: "amazon", link: "https://amazon.com/dp/B0X" });
    const b = stableProductId({ source: "amazon", link: "https://amazon.com/dp/B0X" });
    expect(a).toBe(b);
    expect(a).toMatch(/^p_/);
  });

  it("differs when the source or link differs", () => {
    const a = stableProductId({ source: "amazon", link: "https://a" });
    const b = stableProductId({ source: "ebay", link: "https://a" });
    const c = stableProductId({ source: "amazon", link: "https://b" });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it("falls back to the title when no link exists", () => {
    expect(stableProductId({ source: "cj", title: "Wireless Earbuds" })).toBe(
      stableProductId({ source: "cj", title: "wireless earbuds" })
    );
  });

  it("never returns a value containing a slash", () => {
    expect(stableProductId({ id: "a/b/c" })).toBe("a__SLASH__b__SLASH__c");
  });
});

describe("sanitizeDocId", () => {
  it("replaces slashes with the storage-safe token", () => {
    expect(sanitizeDocId("a/b")).toBe("a__SLASH__b");
  });
});

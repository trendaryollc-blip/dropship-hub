import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as reviewImporter from "@/lib/review-importer";
import type { ProductReview } from "@/types/reviews";

function makeReview(overrides: Partial<ProductReview> = {}): ProductReview {
  return {
    id: "r1",
    productId: "p1",
    productTitle: "Earbuds",
    source: "aliexpress",
    author: "John D.",
    rating: 5,
    title: "Nice",
    content: "Great product",
    images: [],
    verified: false,
    helpful: 0,
    syncStatus: "pending",
    createdAt: "2026-09-20T00:00:00Z",
    ...overrides,
  };
}

describe("review-importer", () => {
  it("exports only the reply template helper", () => {
    expect(reviewImporter).toHaveProperty("generateReviewReplyTemplate");
    expect(reviewImporter).not.toHaveProperty("simulateImport");
    expect(reviewImporter).not.toHaveProperty("generateReviewResponse");
  });

  it("contains no sample review data or simulated import code", () => {
    const source = readFileSync(join(process.cwd(), "src", "lib", "review-importer.ts"), "utf8");
    expect(source).not.toContain("SAMPLE_REVIEWS");
    expect(source).not.toContain("simulateImport");
    expect(source).not.toContain("helpful: 42");
  });

  it("picks a thank-you template for 4–5 star reviews", () => {
    const reply = reviewImporter.generateReviewReplyTemplate(makeReview({ rating: 5 }));
    expect(reply).toContain("John D.");
    expect(reply).toMatch(/thank you/i);
  });

  it("picks a feedback template for 3 star reviews", () => {
    const reply = reviewImporter.generateReviewReplyTemplate(makeReview({ rating: 3, author: "Sam" }));
    expect(reply).toContain("Sam");
    expect(reply).toMatch(/feedback/i);
  });

  it("picks a recovery template for 1–2 star reviews", () => {
    const reply = reviewImporter.generateReviewReplyTemplate(makeReview({ rating: 1 }));
    expect(reply).toMatch(/sorry to hear/i);
    expect(reply).toMatch(/contact us/i);
  });
});

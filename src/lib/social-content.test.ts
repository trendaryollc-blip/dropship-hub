import { describe, it, expect } from "vitest";
import {
  generateSingleContent,
  generateBatchContent,
  generateContentIdeas,
} from "@/lib/social-content";
import type { ContentType } from "@/types/social-content";

const CONTENT_TYPES: ContentType[] = [
  "hook",
  "caption",
  "script",
  "hashtag_set",
  "ad_copy",
  "ugc_script",
  "story",
  "carousel",
];

describe("generateSingleContent", () => {
  it("never embeds invented review or customer counts", () => {
    for (let i = 0; i < 120; i++) {
      const content = generateSingleContent({
        productTitle: "Wireless Earbuds",
        platform: "tiktok",
        contentType: CONTENT_TYPES[i % CONTENT_TYPES.length],
        tone: "urgent",
        targetAudience: "commuters",
      });
      expect(content.content).not.toMatch(/2,847|10,000\+|\$29\.99/);
      expect(content.content).not.toMatch(/\(\d[\d,]* reviews\)/);
    }
  });

  it("uses price placeholders instead of a fabricated price", () => {
    let sawPlaceholder = false;
    for (let i = 0; i < 80; i++) {
      const content = generateSingleContent({
        productTitle: "Wireless Earbuds",
        platform: "tiktok",
        contentType: "hook",
        tone: "urgent",
        targetAudience: "commuters",
      });
      if (content.content.includes("[your price]")) sawPlaceholder = true;
    }
    expect(sawPlaceholder).toBe(true);
  });

  it("replaces review and customer-count slots with placeholders in ad copy", () => {
    let sawReview = false;
    let sawCustomers = false;
    for (let i = 0; i < 80; i++) {
      const content = generateSingleContent({
        productTitle: "Wireless Earbuds",
        platform: "tiktok",
        contentType: "ad_copy",
        tone: "urgent",
        targetAudience: "commuters",
      });
      if (content.content.includes("[X] reviews")) sawReview = true;
      if (content.content.includes("[customer count]")) sawCustomers = true;
      expect(content.content).not.toMatch(/\d[\d,]* (reviews|happy customers)/);
    }
    expect(sawReview).toBe(true);
    expect(sawCustomers).toBe(true);
  });

  it("suggests audio without fabricated usage counts or trend claims", () => {
    for (let i = 0; i < 30; i++) {
      const content = generateSingleContent({
        productTitle: "Wireless Earbuds",
        platform: "tiktok",
        contentType: "caption",
        tone: "casual",
        targetAudience: "commuters",
      });
      expect(content.audioSuggestion).toBeDefined();
      expect(content.audioSuggestion).not.toHaveProperty("usageCount");
      expect(content.audioSuggestion).not.toHaveProperty("trending");
    }
  });
});

describe("generateBatchContent", () => {
  it("produces content without invented metrics", () => {
    const result = generateBatchContent({
      productTitle: "Wireless Earbuds",
      platforms: ["tiktok", "instagram_reels"],
      contentTypes: ["ad_copy", "caption"],
      tone: "casual",
      targetAudience: "commuters",
      count: 6,
    });
    expect(result.contents.length).toBeGreaterThan(0);
    for (const content of result.contents) {
      expect(content.content).not.toMatch(/2,847|10,000\+|\$29\.99/);
      expect(content.audioSuggestion).not.toHaveProperty("usageCount");
    }
  });
});

describe("generateContentIdeas", () => {
  it("returns ideas without numeric engagement claims", () => {
    const ideas = generateContentIdeas("Wireless Earbuds", "tiktok");
    expect(ideas.length).toBeGreaterThan(0);
    for (const idea of ideas) {
      expect(["low", "medium", "high", "viral"]).toContain(idea.estimatedEngagement);
      expect(JSON.stringify(idea)).not.toMatch(/\d+% engagement/);
    }
  });
});

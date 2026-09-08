import { describe, it, expect } from "vitest";
import { analyzeSentiment, detectFrustration, calculateResponsePriority, generateAutoReply } from "./cs-sentiment";

describe("cs-sentiment", () => {
  describe("analyzeSentiment", () => {
    it("detects positive sentiment", () => {
      const result = analyzeSentiment("Thank you so much! This is amazing and awesome service!");
      expect(result.label).toBe("positive");
      expect(result.score).toBeGreaterThan(0);
    });

    it("detects negative sentiment", () => {
      const result = analyzeSentiment("This is terrible! I'm angry and frustrated with this horrible product!");
      expect(result.label).toBe("negative");
      expect(result.score).toBeLessThan(0);
    });

    it("detects neutral sentiment", () => {
      const result = analyzeSentiment("OK I understand. Will do.");
      expect(result.label).toBe("neutral");
    });

    it("detects urgency from caps", () => {
      const result = analyzeSentiment("URGENT HELP NEEDED NOW");
      expect(result.urgency).toBeGreaterThan(5);
    });

    it("detects urgency from exclamation marks", () => {
      const result = analyzeSentiment("Help!!! Please!!! Asap!!!");
      expect(result.urgency).toBeGreaterThan(5);
    });

    it("includes emotions", () => {
      const result = analyzeSentiment("I love this product, it's wonderful!");
      expect(result.emotions.length).toBeGreaterThan(0);
    });

    it("handles empty text", () => {
      const result = analyzeSentiment("");
      expect(result.label).toBe("neutral");
      expect(result.urgency).toBe(0);
    });
  });

  describe("detectFrustration", () => {
    it("detects frustration keywords", () => {
      const result = detectFrustration("This is unacceptable and terrible!");
      expect(result.isFrustrated).toBe(true);
      expect(result.indicators.length).toBeGreaterThan(0);
    });

    it("detects ALL CAPS", () => {
      const result = detectFrustration("THIS IS REALLY BAD");
      expect(result.isFrustrated).toBe(true);
      expect(result.indicators).toContain("ALL CAPS");
    });

    it("detects excessive exclamation", () => {
      const result = detectFrustration("Bad product!!! terrible!!!");
      expect(result.isFrustrated).toBe(true);
      expect(result.indicators).toContain("excessive_exclamation");
    });

    it("returns false for calm message", () => {
      const result = detectFrustration("Thanks for the update");
      expect(result.isFrustrated).toBe(false);
    });
  });

  describe("calculateResponsePriority", () => {
    it("returns urgent for high urgency + high value + many messages", () => {
      const sentiment = { score: -0.8, label: "negative" as const, urgency: 9, emotions: ["frustrated"] };
      expect(calculateResponsePriority(sentiment, 600, 6, false)).toBe("urgent");
    });

    it("returns high for VIP customer", () => {
      const sentiment = { score: -0.3, label: "negative" as const, urgency: 5, emotions: ["neutral"] };
      expect(calculateResponsePriority(sentiment, 100, 2, true)).toBe("high");
    });

    it("returns low for calm customer", () => {
      const sentiment = { score: 0.5, label: "positive" as const, urgency: 1, emotions: ["satisfied"] };
      expect(calculateResponsePriority(sentiment, 20, 1, false)).toBe("low");
    });

    it("considers message count", () => {
      const sentiment = { score: 0, label: "neutral" as const, urgency: 3, emotions: ["neutral"] };
      const high = calculateResponsePriority(sentiment, 50, 6, false);
      const low = calculateResponsePriority(sentiment, 50, 1, false);
      expect(high).not.toBe("low");
    });
  });

  describe("generateAutoReply", () => {
    it("generates positive reply for satisfied customer", () => {
      const sentiment = { score: 0.8, label: "positive" as const, urgency: 1, emotions: ["satisfied"] };
      const reply = generateAutoReply(sentiment, "Thank you!");
      expect(reply).toContain("welcome");
    });

    it("generates empathetic reply for frustrated customer", () => {
      const sentiment = { score: -0.8, label: "negative" as const, urgency: 8, emotions: ["frustrated"] };
      const reply = generateAutoReply(sentiment, "This is urgent!");
      expect(reply.toLowerCase()).toContain("priority");
    });

    it("handles refund requests", () => {
      const sentiment = { score: -0.5, label: "negative" as const, urgency: 5, emotions: ["dissatisfied"] };
      const reply = generateAutoReply(sentiment, "I want a refund");
      expect(reply.toLowerCase()).toContain("refund");
    });

    it("handles broken product complaints", () => {
      const sentiment = { score: -0.6, label: "negative" as const, urgency: 6, emotions: ["frustrated"] };
      const reply = generateAutoReply(sentiment, "My item is broken and defective");
      expect(reply.toLowerCase()).toContain("replace");
    });

    it("generates neutral reply for general inquiry", () => {
      const sentiment = { score: 0, label: "neutral" as const, urgency: 2, emotions: ["neutral"] };
      const reply = generateAutoReply(sentiment, "How does this work?");
      expect(reply).toBeTruthy();
    });

    it("includes order status when available", () => {
      const sentiment = { score: 0, label: "neutral" as const, urgency: 2, emotions: ["neutral"] };
      const reply = generateAutoReply(sentiment, "Where is my order?", { orderStatus: "shipped" });
      expect(reply).toContain("shipped");
    });
  });
});

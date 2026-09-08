import { describe, it, expect } from "vitest";
import { evaluateEscalation, getDefaultRules, validateEscalationRule, calculateEscalationUrgency } from "./cs-escalation-rules";
import type { EscalationRule, SentimentResult } from "@/types/customer-service";

const baseSentiment: SentimentResult = { score: 0, label: "neutral", urgency: 3, emotions: ["neutral"] };

describe("cs-escalation-rules", () => {
  describe("evaluateEscalation", () => {
    it("escalates high value orders", () => {
      const result = evaluateEscalation({
        message: "Help me",
        sentiment: baseSentiment,
        orderValue: 300,
        messageCount: 1,
        responseCount: 0,
        isVip: false,
        previousEscalations: 0,
        customerName: "John",
        conversationAge: 1,
      });
      expect(result.shouldEscalate).toBe(true);
      expect(result.action).toBe("escalate");
    });

    it("escalates frustrated customers", () => {
      const result = evaluateEscalation({
        message: "This is angry and furious!",
        sentiment: { score: -0.8, label: "negative", urgency: 8, emotions: ["frustrated"] },
        orderValue: 50,
        messageCount: 2,
        responseCount: 0,
        isVip: false,
        previousEscalations: 0,
        customerName: "Jane",
        conversationAge: 1,
      });
      expect(result.shouldEscalate).toBe(true);
    });

    it("does not escalate calm customers", () => {
      const result = evaluateEscalation({
        message: "Thanks for the info",
        sentiment: { score: 0.5, label: "positive", urgency: 1, emotions: ["satisfied"] },
        orderValue: 30,
        messageCount: 1,
        responseCount: 0,
        isVip: false,
        previousEscalations: 0,
        customerName: "Bob",
        conversationAge: 1,
      });
      expect(result.shouldEscalate).toBe(false);
    });

    it("tags VIP customers", () => {
      const result = evaluateEscalation({
        message: "Quick question",
        sentiment: baseSentiment,
        orderValue: 50,
        messageCount: 1,
        responseCount: 0,
        isVip: true,
        previousEscalations: 0,
        customerName: "VIP",
        conversationAge: 1,
      });
      expect(result.action).toBe("tag_priority");
      expect(result.priority).toBe("high");
    });

    it("notifies manager for repeated contact", () => {
      const result = evaluateEscalation({
        message: "Still waiting",
        sentiment: baseSentiment,
        orderValue: 50,
        messageCount: 6,
        responseCount: 0,
        isVip: false,
        previousEscalations: 0,
        customerName: "Dave",
        conversationAge: 5,
      });
      expect(result.action).toBe("notify_manager");
    });

    it("returns no escalation for default message", () => {
      const result = evaluateEscalation({
        message: "Hello",
        sentiment: baseSentiment,
        orderValue: 20,
        messageCount: 1,
        responseCount: 0,
        isVip: false,
        previousEscalations: 0,
        customerName: "Test",
        conversationAge: 1,
      });
      expect(result.shouldEscalate).toBe(false);
    });

    it("includes urgency score in result", () => {
      const result = evaluateEscalation({
        message: "Urgent help needed!",
        sentiment: { score: -0.5, label: "negative", urgency: 7, emotions: ["frustrated"] },
        orderValue: 100,
        messageCount: 3,
        responseCount: 0,
        isVip: false,
        previousEscalations: 0,
        customerName: "Urgent",
        conversationAge: 2,
      });
      expect(result.urgencyScore).toBeGreaterThan(0);
    });
  });

  describe("getDefaultRules", () => {
    it("returns default rules", () => {
      const rules = getDefaultRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((r) => r.id && r.name && r.action)).toBe(true);
    });

    it("includes high value order rule", () => {
      const rules = getDefaultRules();
      expect(rules.some((r) => r.name === "High Value Order")).toBe(true);
    });

    it("includes frustration rule", () => {
      const rules = getDefaultRules();
      expect(rules.some((r) => r.name === "Customer Frustration")).toBe(true);
    });
  });

  describe("validateEscalationRule", () => {
    it("returns no errors for valid rule", () => {
      const errors = validateEscalationRule({
        name: "Test Rule",
        enabled: true,
        conditions: { minOrderValue: 100 },
        action: "escalate",
        priority: "high",
      });
      expect(errors.length).toBe(0);
    });

    it("requires name", () => {
      const errors = validateEscalationRule({ name: "", action: "escalate", priority: "high", enabled: true, conditions: {} });
      expect(errors.some((e) => e.includes("name"))).toBe(true);
    });

    it("requires action", () => {
      const rule: any = { name: "Test", priority: "high", enabled: true, conditions: {} };
      const errors = validateEscalationRule(rule);
      expect(errors.some((e) => e.toLowerCase().includes("action"))).toBe(true);
    });

    it("validates urgency score range", () => {
      const errors = validateEscalationRule({
        name: "Test",
        action: "escalate",
        priority: "high",
        enabled: true,
        conditions: { minUrgencyScore: 15 },
      });
      expect(errors.some((e) => e.toLowerCase().includes("urgency"))).toBe(true);
    });

    it("validates sentiment threshold range", () => {
      const errors = validateEscalationRule({
        name: "Test",
        action: "escalate",
        priority: "high",
        enabled: true,
        conditions: { sentimentThreshold: 2 },
      });
      expect(errors.some((e) => e.toLowerCase().includes("sentiment"))).toBe(true);
    });
  });

  describe("calculateEscalationUrgency", () => {
    it("returns high urgency for frustrated high-value customer", () => {
      const urgency = calculateEscalationUrgency(
        { score: -0.8, label: "negative", urgency: 9, emotions: ["frustrated"] },
        600, 5, true
      );
      expect(urgency).toBeGreaterThanOrEqual(8);
    });

    it("returns low urgency for calm customer", () => {
      const urgency = calculateEscalationUrgency(
        { score: 0.5, label: "positive", urgency: 1, emotions: ["satisfied"] },
        20, 1, false
      );
      expect(urgency).toBeLessThanOrEqual(4);
    });

    it("caps at 10", () => {
      const urgency = calculateEscalationUrgency(
        { score: -1, label: "negative", urgency: 10, emotions: ["very_frustrated"] },
        1000, 10, true
      );
      expect(urgency).toBeLessThanOrEqual(10);
    });
  });
});

import type { EscalationRule, SentimentResult } from "@/types/customer-service";

export interface EscalationContext {
  message: string;
  sentiment: SentimentResult;
  orderValue: number;
  messageCount: number;
  responseCount: number;
  isVip: boolean;
  previousEscalations: number;
  customerName: string;
  conversationAge: number;
}

export interface EscalationResult {
  shouldEscalate: boolean;
  action: EscalationRule["action"];
  priority: "low" | "medium" | "high";
  reason: string;
  matchedRule?: string;
  urgencyScore: number;
}

const DEFAULT_RULES: EscalationRule[] = [
  {
    id: "rule-high-value",
    name: "High Value Order",
    enabled: true,
    conditions: { minOrderValue: 200 },
    action: "escalate",
    priority: "high",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rule-frustration",
    name: "Customer Frustration",
    enabled: true,
    conditions: {
      minUrgencyScore: 7,
      frustrationKeywords: ["angry", "furious", "unacceptable", "terrible", "worst", "scam"],
    },
    action: "escalate",
    priority: "high",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rule-low-confidence",
    name: "Low AI Confidence",
    enabled: true,
    conditions: { sentimentThreshold: -0.5 },
    action: "tag_priority",
    priority: "medium",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rule-repeated-contact",
    name: "Repeated Contact",
    enabled: true,
    conditions: { messageCount: 5 },
    action: "notify_manager",
    priority: "medium",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rule-vip",
    name: "VIP Customer",
    enabled: true,
    conditions: { vipCustomer: true },
    action: "tag_priority",
    priority: "high",
    createdAt: new Date().toISOString(),
  },
];

export function evaluateEscalation(
  context: EscalationContext,
  rules: EscalationRule[] = DEFAULT_RULES
): EscalationResult {
  const enabledRules = rules.filter((r) => r.enabled);
  const matchedRules: { rule: EscalationRule; score: number }[] = [];

  for (const rule of enabledRules) {
    let matches = true;
    let score = 0;

    const c = rule.conditions;

    if (c.minOrderValue !== undefined && context.orderValue < c.minOrderValue) {
      matches = false;
    } else if (c.minOrderValue !== undefined) {
      score += Math.min(context.orderValue / c.minOrderValue, 3);
    }

    if (c.minUrgencyScore !== undefined && context.sentiment.urgency < c.minUrgencyScore) {
      matches = false;
    } else if (c.minUrgencyScore !== undefined) {
      score += (context.sentiment.urgency / 10) * 2;
    }

    if (c.sentimentThreshold !== undefined && context.sentiment.score > c.sentimentThreshold) {
      matches = false;
    } else if (c.sentimentThreshold !== undefined) {
      score += Math.abs(context.sentiment.score) * 2;
    }

    if (c.frustrationKeywords && c.frustrationKeywords.length > 0) {
      const lower = context.message.toLowerCase();
      const hasFrustration = c.frustrationKeywords.some((kw) => lower.includes(kw));
      if (!hasFrustration) {
        matches = false;
      } else {
        score += 2;
      }
    }

    if (c.vipCustomer !== undefined && context.isVip !== c.vipCustomer) {
      matches = false;
    } else if (c.vipCustomer && context.isVip) {
      score += 2;
    }

    if (c.messageCount !== undefined && context.messageCount < c.messageCount) {
      matches = false;
    } else if (c.messageCount !== undefined) {
      score += (context.messageCount / c.messageCount);
    }

    if (c.responseCount !== undefined && context.responseCount < c.responseCount) {
      matches = false;
    } else if (c.responseCount !== undefined) {
      score += (context.responseCount / c.responseCount);
    }

    if (matches) {
      matchedRules.push({ rule, score });
    }
  }

  if (matchedRules.length === 0) {
    return {
      shouldEscalate: false,
      action: "auto_respond",
      priority: "low",
      reason: "No escalation rules matched",
      urgencyScore: context.sentiment.urgency,
    };
  }

  matchedRules.sort((a, b) => b.score - a.score);
  const bestMatch = matchedRules[0];

  const urgencyScore = Math.min(10, Math.round(
    context.sentiment.urgency +
    (matchedRules.length > 1 ? 1 : 0) +
    (context.previousEscalations > 0 ? 1 : 0)
  ));

  return {
    shouldEscalate: bestMatch.rule.action === "escalate",
    action: bestMatch.rule.action,
    priority: bestMatch.rule.priority,
    reason: `Rule "${bestMatch.rule.name}" matched (score: ${bestMatch.score.toFixed(1)})`,
    matchedRule: bestMatch.rule.id,
    urgencyScore,
  };
}

export function getDefaultRules(): EscalationRule[] {
  return [...DEFAULT_RULES];
}

export function validateEscalationRule(rule: Partial<EscalationRule>): string[] {
  const errors: string[] = [];
  if (!rule.name || rule.name.trim().length === 0) errors.push("Rule name is required");
  if (!rule.action) errors.push("Action is required");
  if (!rule.priority) errors.push("Priority is required");

  if (rule.conditions) {
    if (rule.conditions.minOrderValue !== undefined && rule.conditions.minOrderValue < 0) {
      errors.push("Minimum order value must be positive");
    }
    if (rule.conditions.minUrgencyScore !== undefined && (rule.conditions.minUrgencyScore < 1 || rule.conditions.minUrgencyScore > 10)) {
      errors.push("Urgency score must be between 1 and 10");
    }
    if (rule.conditions.sentimentThreshold !== undefined && (rule.conditions.sentimentThreshold < -1 || rule.conditions.sentimentThreshold > 1)) {
      errors.push("Sentiment threshold must be between -1 and 1");
    }
    if (rule.conditions.messageCount !== undefined && rule.conditions.messageCount < 1) {
      errors.push("Message count must be at least 1");
    }
  }

  return errors;
}

export function calculateEscalationUrgency(
  sentiment: SentimentResult,
  orderValue: number,
  messageCount: number,
  isVip: boolean
): number {
  let score = 0;
  score += sentiment.urgency;
  if (orderValue > 500) score += 3;
  else if (orderValue > 100) score += 2;
  else if (orderValue > 50) score += 1;
  if (messageCount > 5) score += 2;
  else if (messageCount > 3) score += 1;
  if (isVip) score += 2;
  return Math.min(10, score);
}

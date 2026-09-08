import type { SentimentResult } from "@/types/customer-service";

const POSITIVE_WORDS = new Set([
  "thanks", "thank", "great", "awesome", "excellent", "perfect", "love", "amazing",
  "wonderful", "fantastic", "happy", "pleased", "satisfied", "helpful", "good",
  "nice", "best", "recommend", "appreciate", "grateful", "impressed", "outstanding",
  "superb", "brilliant", "exceptional", "delighted", "fabulous", "magnificent",
  "marvelous", "phenomenal", "remarkable", "splendid", "stellar", "terrific",
  "thrilled", "awesome", "cool", "sweet", "yes", "absolutely", "definitely",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "terrible", "awful", "horrible", "worst", "hate", "angry", "frustrated",
  "disappointed", "annoyed", "furious", "disgusted", "unacceptable", "poor",
  "slow", "broken", "defective", "wrong", "missing", "late", "damaged", "refund",
  "cancel", "complaint", "problem", "issue", "error", "fail", "failed", "failure",
  "scam", "rip", "robbed", "waste", "useless", "trash", "garbage", "rubbish",
  "pathetic", "disaster", "catastrophe", "nightmare", "never", "again",
]);

const URGENCY_WORDS = new Set([
  "urgent", "asap", "immediately", "emergency", "critical", "now", "today",
  "hurry", "rush", "fast", "quick", "speedy", "prompt", "expedite", "deadline",
  "time-sensitive", "overdue", "past due", "late", "delayed", "stuck",
]);

const FRUSTRATION_INDICATORS = new Set([
  "frustrated", "angry", "furious", "outraged", "livid", "infuriated",
  "unacceptable", "ridiculous", "absurd", "laughable", "joke", "pathetic",
  "disgusting", "appalling", "shocking", "terrible", "horrible", "awful",
  "worst", "never again", "scam", "rip off", "waste of money",
]);

const CALM_WORDS_ARRAY = [
  "okay", "ok", "fine", "alright", "understood", "sure", "will do", "noted",
  "thank you", "thanks", "appreciate", "no problem", "no worries",
];

export function analyzeSentiment(text: string): SentimentResult {
  const lower = text.toLowerCase();
  const words = lower.split(/[^a-z]+/).filter((w) => w.length > 1);

  let positiveCount = 0;
  let negativeCount = 0;
  let urgencyScore = 0;
  let frustrationScore = 0;
  const emotions: string[] = [];

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveCount++;
    if (NEGATIVE_WORDS.has(word)) negativeCount++;
    if (URGENCY_WORDS.has(word)) urgencyScore++;
    if (FRUSTRATION_INDICATORS.has(word)) frustrationScore++;
  }

  const exclamationCount = (text.match(/!/g) || []).length;
  const capsRatio = text.length > 0 ? (text.match(/[A-Z]/g) || []).length / text.length : 0;
  const questionCount = (text.match(/\?/g) || []).length;

  if (capsRatio > 0.5 && text.length > 5) {
    frustrationScore += 2;
    emotions.push("shouting");
  }
  if (exclamationCount > 2) {
    frustrationScore += 1;
    emotions.push("intense");
  }
  if (questionCount > 2) {
    urgencyScore += 1;
    emotions.push("confused");
  }

  const total = positiveCount + negativeCount || 1;
  const score = ((positiveCount - negativeCount) / total);

  let label: "positive" | "neutral" | "negative";
  if (score > 0.15) {
    label = "positive";
    if (positiveCount > 3) emotions.push("very_satisfied");
    else emotions.push("satisfied");
  } else if (score < -0.15) {
    label = "negative";
    if (frustrationScore > 2) emotions.push("very_frustrated");
    else if (frustrationScore > 0) emotions.push("frustrated");
    else emotions.push("dissatisfied");
  } else {
    label = "neutral";
    if (CALM_WORDS_ARRAY.some((w) => lower.includes(w))) emotions.push("calm");
  }

  const urgency = Math.min(10, Math.round(
    (urgencyScore * 2) +
    (frustrationScore * 1.5) +
    (exclamationCount * 0.5) +
    (capsRatio * 3) +
    (label === "negative" ? 2 : 0)
  ));

  return {
    score: Math.round(score * 100) / 100,
    label,
    urgency,
    emotions: emotions.length > 0 ? emotions : ["neutral"],
  };
}

export function detectFrustration(text: string): { isFrustrated: boolean; indicators: string[] } {
  const lower = text.toLowerCase();
  const indicators: string[] = [];

  for (const indicator of FRUSTRATION_INDICATORS) {
    if (lower.includes(indicator)) {
      indicators.push(indicator);
    }
  }

  const capsRatio = text.length > 0 ? (text.match(/[A-Z]/g) || []).length / text.length : 0;
  if (capsRatio > 0.5 && text.length > 5) {
    indicators.push("ALL CAPS");
  }

  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 2) {
    indicators.push("excessive_exclamation");
  }

  return {
    isFrustrated: indicators.length > 0,
    indicators,
  };
}

export function calculateResponsePriority(
  sentiment: SentimentResult,
  orderValue: number,
  messageCount: number,
  isVip: boolean
): "low" | "medium" | "high" | "urgent" {
  let score = 0;

  if (sentiment.urgency >= 8) score += 4;
  else if (sentiment.urgency >= 5) score += 3;
  else if (sentiment.urgency >= 3) score += 2;
  else score += 1;

  if (orderValue > 500) score += 3;
  else if (orderValue > 100) score += 2;
  else if (orderValue > 50) score += 1;

  if (messageCount > 5) score += 2;
  else if (messageCount > 3) score += 1;

  if (isVip) score += 2;

  if (score >= 8) return "urgent";
  if (score >= 6) return "high";
  if (score >= 4) return "medium";
  return "low";
}

export function generateAutoReply(
  sentiment: SentimentResult,
  message: string,
  context?: { productTitle?: string; orderStatus?: string }
): string {
  const lower = message.toLowerCase();

  if (sentiment.label === "positive") {
    if (lower.includes("thank")) {
      return "You're welcome! We're glad we could help. Is there anything else you need?";
    }
    return "We're happy to hear that! Don't hesitate to reach out if you need anything else.";
  }

  if (sentiment.label === "negative") {
    if (sentiment.urgency >= 7) {
      return "We understand your frustration and we're treating this as a priority. A specialist will review your case immediately and get back to you within the hour.";
    }
    if (lower.includes("refund")) {
      return "We're sorry about your experience. We've initiated a refund review for your order. You'll receive an update within 24 hours.";
    }
    if (lower.includes("broken") || lower.includes("defective") || lower.includes("damaged")) {
      return "We sincerely apologize for the issue. We'll arrange a replacement or full refund — whichever you prefer. Please confirm your order number so we can process this right away.";
    }
    return "We're sorry to hear about your experience. Your satisfaction is our priority. Could you provide more details so we can resolve this for you?";
  }

  if (context?.orderStatus) {
    return `Your order status is: ${context.orderStatus}. Let us know if you need more details!`;
  }

  return "Thank you for reaching out! How can we help you today?";
}

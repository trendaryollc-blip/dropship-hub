import type { KnowledgeBaseEntry } from "@/types/customer-service";

export interface KBSearchResult {
  entry: KnowledgeBaseEntry;
  relevance: number;
  matchedKeywords: string[];
}

export function searchKnowledgeBase(
  entries: KnowledgeBaseEntry[],
  query: string,
  maxResults: number = 5
): KBSearchResult[] {
  const lower = query.toLowerCase();
  const queryWords = lower.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const results: KBSearchResult[] = [];

  for (const entry of entries) {
    let relevance = 0;
    const matchedKeywords: string[] = [];

    const titleLower = entry.title.toLowerCase();
    for (const word of queryWords) {
      if (titleLower.includes(word)) {
        relevance += 3;
        matchedKeywords.push(word);
      }
    }

    const contentLower = entry.content.toLowerCase();
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        relevance += 1;
        if (!matchedKeywords.includes(word)) matchedKeywords.push(word);
      }
    }

    for (const kw of entry.keywords) {
      const kwLower = kw.toLowerCase();
      for (const word of queryWords) {
        if (kwLower.includes(word) || word.includes(kwLower)) {
          relevance += 2;
          if (!matchedKeywords.includes(kw)) matchedKeywords.push(kw);
        }
      }
    }

    if (entry.productTitle) {
      const ptLower = entry.productTitle.toLowerCase();
      for (const word of queryWords) {
        if (ptLower.includes(word)) {
          relevance += 2;
        }
      }
    }

    relevance += Math.min(entry.usageCount * 0.1, 3);

    if (relevance > 0) {
      results.push({ entry, relevance, matchedKeywords });
    }
  }

  results.sort((a, b) => b.relevance - a.relevance);
  return results.slice(0, maxResults);
}

export function buildKnowledgeBaseFromProducts(
  products: { title: string; description: string; price: number; specifications?: Record<string, string> }[]
): Omit<KnowledgeBaseEntry, "id" | "createdAt">[] {
  const entries: Omit<KnowledgeBaseEntry, "id" | "createdAt">[] = [];

  for (const product of products) {
    entries.push({
      category: "product",
      title: `Product: ${product.title}`,
      content: product.description,
      keywords: extractProductKeywords(product.title, product.description),
      productTitle: product.title,
      usageCount: 0,
    });

    if (product.specifications) {
      const specs = Object.entries(product.specifications)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      entries.push({
        category: "product",
        title: `Specs: ${product.title}`,
        content: specs,
        keywords: Object.keys(product.specifications).map((k) => k.toLowerCase()),
        productTitle: product.title,
        usageCount: 0,
      });
    }
  }

  return entries;
}

export function buildKnowledgeBaseFromOrders(
  orders: { productTitle: string; status: string; trackingNumber?: string; shippingDays?: number }[]
): Omit<KnowledgeBaseEntry, "id" | "createdAt">[] {
  const statusMap = new Map<string, { content: string; keywords: string[] }>();

  for (const order of orders) {
    const key = order.status;
    const existing = statusMap.get(key);
    if (existing) {
      existing.content += `\n- ${order.productTitle}${order.trackingNumber ? ` (Tracking: ${order.trackingNumber})` : ""}`;
    } else {
      statusMap.set(key, {
        content: `Order status "${order.status}":\n- ${order.productTitle}${order.trackingNumber ? ` (Tracking: ${order.trackingNumber})` : ""}`,
        keywords: [order.status.toLowerCase(), "order", "status"],
      });
    }
  }

  const entries: Omit<KnowledgeBaseEntry, "id" | "createdAt">[] = [];
  for (const [status, data] of statusMap) {
    entries.push({
      category: "shipping",
      title: `Order Status: ${status}`,
      content: data.content,
      keywords: [...new Set([...data.keywords, "order", "tracking", "shipping", status.toLowerCase()])],
      usageCount: 0,
    });
  }

  return entries;
}

export function generateFAQEntries(): Omit<KnowledgeBaseEntry, "id" | "createdAt">[] {
  return [
    {
      category: "faq",
      title: "Shipping Time",
      content: "Standard shipping takes 7-15 business days. Express shipping takes 3-5 business days. International orders may take 15-30 business days depending on destination.",
      keywords: ["shipping", "delivery", "time", "how long", "when", "arrive", "days"],
      usageCount: 0,
    },
    {
      category: "returns",
      title: "Return Policy",
      content: "We offer a 30-day return policy. Items must be unused and in original packaging. Contact us to initiate a return. Refunds are processed within 5-7 business days of receiving the return.",
      keywords: ["return", "refund", "exchange", "money back", "30 days", "policy"],
      usageCount: 0,
    },
    {
      category: "shipping",
      title: "Order Tracking",
      content: "You can track your order using the tracking number provided in your confirmation email. Most tracking updates appear within 24-48 hours of shipment.",
      keywords: ["track", "tracking", "where", "order", "number", "update"],
      usageCount: 0,
    },
    {
      category: "faq",
      title: "Payment Methods",
      content: "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, and Google Pay.",
      keywords: ["payment", "pay", "credit card", "visa", "paypal", "apple pay", "method"],
      usageCount: 0,
    },
    {
      category: "policy",
      title: "Privacy Policy",
      content: "We respect your privacy. We never sell your personal information to third parties. All payment information is encrypted and processed securely.",
      keywords: ["privacy", "personal", "information", "data", "security", "safe"],
      usageCount: 0,
    },
  ];
}

function extractProductKeywords(title: string, description: string): string[] {
  const combined = `${title} ${description}`.toLowerCase();
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "is", "it", "that", "this", "was", "are", "be", "has", "had", "have"]);
  const words = combined.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !stopWords.has(w));
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);
}

export function formatKnowledgeBaseResponse(results: KBSearchResult[]): string {
  if (results.length === 0) return "";
  return results
    .map((r) => `[${r.entry.title}]: ${r.entry.content}`)
    .join("\n\n");
}

export function categorizeIncomingMessage(message: string): "order_status" | "refund" | "product_question" | "complaint" | "general" {
  const lower = message.toLowerCase();
  if (lower.includes("where") || lower.includes("track") || lower.includes("shipping") || lower.includes("delivery")) return "order_status";
  if (lower.includes("refund") || lower.includes("money back") || lower.includes("return")) return "refund";
  if (lower.includes("broken") || lower.includes("defective") || lower.includes("damaged") || lower.includes("wrong")) return "complaint";
  if (lower.includes("how") || lower.includes("what") || lower.includes("does") || lower.includes("compatible")) return "product_question";
  return "general";
}

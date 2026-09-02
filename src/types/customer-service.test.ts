import { describe, it, expect } from "vitest";

describe("types/customer-service", () => {
  it("Conversation type can be constructed", () => {
    const conv: import("./customer-service").Conversation = {
      id: "1",
      customerName: "John",
      customerEmail: "john@test.com",
      platform: "shopify",
      status: "active",
      priority: "high",
      subject: "Order issue",
      lastMessage: "Help me",
      lastMessageAt: "2026-01-01T00:00:00Z",
      messageCount: 5,
      aiHandled: true,
      tags: ["urgent"],
    };
    expect(conv.platform).toBe("shopify");
    expect(conv.status).toBe("active");
  });

  it("CSMessage type can be constructed", () => {
    const msg: import("./customer-service").CSMessage = {
      id: "1",
      conversationId: "conv-1",
      role: "customer",
      content: "Where is my order?",
      confidence: 0.95,
      timestamp: "2026-01-01T00:00:00Z",
    };
    expect(msg.role).toBe("customer");
  });

  it("CSTemplate type can be constructed", () => {
    const tpl: import("./customer-service").CSTemplate = {
      id: "1",
      name: "Order Status",
      category: "order-status",
      subject: "Your order status",
      body: "Your order {{orderId}} is {{status}}",
      variables: ["orderId", "status"],
      usageCount: 42,
      createdAt: "2026-01-01T00:00:00Z",
    };
    expect(tpl.variables).toHaveLength(2);
  });

  it("Escalation type can be constructed", () => {
    const esc: import("./customer-service").Escalation = {
      id: "1",
      conversationId: "conv-1",
      customerName: "Jane",
      reason: "low_confidence",
      reasonDetail: "AI unsure",
      confidence: 0.3,
      customerMessage: "Complex issue",
      status: "pending",
      createdAt: "2026-01-01T00:00:00Z",
    };
    expect(esc.reason).toBe("low_confidence");
  });

  it("CSStats type can be constructed", () => {
    const stats: import("./customer-service").CSStats = {
      activeConversations: 10,
      escalatedQueue: 2,
      resolvedToday: 15,
      avgConfidence: 0.88,
      resolutionRate: 0.92,
      avgResponseTime: "2m",
      totalHandled: 100,
      aiHandledPercent: 75,
    };
    expect(stats.aiHandledPercent).toBe(75);
  });
});

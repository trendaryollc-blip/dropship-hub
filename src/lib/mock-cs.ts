import type { Conversation, CSMessage, CSTemplate, Escalation, CSStats } from "@/types/customer-service";

export const mockConversations: Conversation[] = [
  { id: "conv-1", customerName: "Sarah Mitchell", customerEmail: "sarah@example.com", platform: "shopify", status: "active", priority: "medium", subject: "Where is my order?", lastMessage: "I ordered 5 days ago and haven't received any tracking info.", lastMessageAt: new Date(Date.now() - 10 * 60000).toISOString(), messageCount: 3, aiHandled: true, tags: ["order-status", "shipping"] },
  { id: "conv-2", customerName: "James Wilson", customerEmail: "james.w@example.com", platform: "email", status: "escalated", priority: "high", subject: "Wrong item received", lastMessage: "This is the second time I've received the wrong product. I'm very frustrated.", lastMessageAt: new Date(Date.now() - 25 * 60000).toISOString(), messageCount: 5, aiHandled: false, escalatedTo: "Support Team", tags: ["returns", "complaint"] },
  { id: "conv-3", customerName: "Emily Chen", customerEmail: "emily.c@example.com", platform: "live-chat", status: "resolved", priority: "low", subject: "Product dimensions", lastMessage: "Thanks for the help!", lastMessageAt: new Date(Date.now() - 120 * 60000).toISOString(), messageCount: 4, aiHandled: true, tags: ["product-info"] },
  { id: "conv-4", customerName: "Michael Brown", customerEmail: "mbrown@example.com", platform: "shopify", status: "waiting", priority: "medium", subject: "Refund request", lastMessage: "I'd like to return this item, it doesn't match the description.", lastMessageAt: new Date(Date.now() - 45 * 60000).toISOString(), messageCount: 2, aiHandled: true, tags: ["returns", "refund"] },
  { id: "conv-5", customerName: "Lisa Anderson", customerEmail: "lisa.a@example.com", platform: "email", status: "active", priority: "low", subject: "Bulk order inquiry", lastMessage: "Do you offer discounts for orders of 50+ units?", lastMessageAt: new Date(Date.now() - 5 * 60000).toISOString(), messageCount: 1, aiHandled: true, tags: ["general", "bulk"] },
  { id: "conv-6", customerName: "David Lee", customerEmail: "dlee@example.com", platform: "live-chat", status: "escalated", priority: "high", subject: "Defective product", lastMessage: "The product stopped working after 2 days. This is unacceptable quality.", lastMessageAt: new Date(Date.now() - 15 * 60000).toISOString(), messageCount: 6, aiHandled: false, escalatedTo: "Support Team", tags: ["defective", "complaint"] },
  { id: "conv-7", customerName: "Rachel Green", customerEmail: "rachel.g@example.com", platform: "shopify", status: "resolved", priority: "low", subject: "Shipping time question", lastMessage: "Perfect, that answers my question.", lastMessageAt: new Date(Date.now() - 180 * 60000).toISOString(), messageCount: 2, aiHandled: true, tags: ["shipping"] },
  { id: "conv-8", customerName: "Tom Harris", customerEmail: "tom.h@example.com", platform: "email", status: "active", priority: "medium", subject: "Discount code not working", lastMessage: "I tried using SAVE20 at checkout but it says invalid code.", lastMessageAt: new Date(Date.now() - 8 * 60000).toISOString(), messageCount: 2, aiHandled: true, tags: ["general", "promo"] },
];

export const mockMessages: Record<string, CSMessage[]> = {
  "conv-1": [
    { id: "m1-1", conversationId: "conv-1", role: "customer", content: "Hi, I placed an order 5 days ago but haven't received any tracking information yet. Order #12345.", timestamp: new Date(Date.now() - 30 * 60000).toISOString() },
    { id: "m1-2", conversationId: "conv-1", role: "ai", content: "Hi Sarah! I can help you track your order. Let me look that up for you.\n\nYour order #12345 was placed on August 19th and is currently **in transit**. Here are the details:\n\n- **Status:** Shipped\n- **Tracking Number:** CJ123456789\n- **Estimated Delivery:** August 26-28\n- **Carrier:** CJ Standard Shipping\n\nYou can track your package using the tracking number above. Is there anything else I can help with?", confidence: 95, timestamp: new Date(Date.now() - 29 * 60000).toISOString() },
    { id: "m1-3", conversationId: "conv-1", role: "customer", content: "Oh great, thank you! I was worried it got lost. Can I change the delivery address?", timestamp: new Date(Date.now() - 10 * 60000).toISOString() },
  ],
  "conv-2": [
    { id: "m2-1", conversationId: "conv-2", role: "customer", content: "I received my order today and it's completely wrong. I ordered a wireless keyboard and received a phone case.", timestamp: new Date(Date.now() - 60 * 60000).toISOString() },
    { id: "m2-2", conversationId: "conv-2", role: "ai", content: "I'm really sorry to hear about this mix-up, James. That's definitely not the experience we want for our customers.\n\nI can help you with a return and replacement. Here's what I can do:\n\n1. **Free return shipping** - We'll email you a prepaid label\n2. **Full replacement** - We'll ship the correct item immediately\n3. **10% discount** on your next order as an apology\n\nWould you like me to proceed with this?", confidence: 88, timestamp: new Date(Date.now() - 58 * 60000).toISOString() },
    { id: "m2-3", conversationId: "conv-2", role: "customer", content: "This is the second time this has happened! Last month I also got the wrong item. I'm very frustrated with your service.", timestamp: new Date(Date.now() - 25 * 60000).toISOString() },
  ],
};

export const mockTemplates: CSTemplate[] = [
  { id: "t-1", name: "Order Status Update", category: "order-status", subject: "Your Order Status", body: "Hi {{customer_name}},\n\nYour order {{order_id}} is currently {{status}}.\n\nTracking: {{tracking_number}}\nEstimated Delivery: {{delivery_date}}\n\nLet us know if you have any questions!", variables: ["customer_name", "order_id", "status", "tracking_number", "delivery_date"], usageCount: 156, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: "t-2", name: "Shipping Delay Apology", category: "shipping", subject: "Update on Your Order", body: "Hi {{customer_name}},\n\nWe wanted to update you on order {{order_id}}. There's been a slight delay due to {{reason}}.\n\nNew estimated delivery: {{new_date}}\n\nWe apologize for the inconvenience. As a thank you for your patience, here's a {{discount}}% discount code: {{code}}\n\nThank you for your understanding!", variables: ["customer_name", "order_id", "reason", "new_date", "discount", "code"], usageCount: 89, createdAt: new Date(Date.now() - 25 * 86400000).toISOString() },
  { id: "t-3", name: "Return Approved", category: "returns", subject: "Return Request Approved", body: "Hi {{customer_name}},\n\nYour return request for order {{order_id}} has been approved.\n\nReturn Label: {{return_label_url}}\nRefund Amount: ${{refund_amount}}\n\nPlease ship the item back within 14 days. Once we receive it, your refund will be processed within 3-5 business days.", variables: ["customer_name", "order_id", "return_label_url", "refund_amount"], usageCount: 67, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: "t-4", name: "Product Specs", category: "product-info", subject: "Product Information", body: "Hi {{customer_name}},\n\nHere are the details for {{product_name}}:\n\n- Dimensions: {{dimensions}}\n- Weight: {{weight}}\n- Material: {{material}}\n- Color: {{color}}\n\n{{additional_info}}\n\nLet me know if you need anything else!", variables: ["customer_name", "product_name", "dimensions", "weight", "material", "color", "additional_info"], usageCount: 42, createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: "t-5", name: "Refund Processed", category: "returns", subject: "Your Refund Has Been Processed", body: "Hi {{customer_name}},\n\nYour refund of ${{amount}} for order {{order_id}} has been processed.\n\nThe refund will appear on your {{payment_method}} within 5-10 business days.\n\nThank you for your patience!", variables: ["customer_name", "amount", "order_id", "payment_method"], usageCount: 34, createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
];

export const mockEscalations: Escalation[] = [
  { id: "esc-1", conversationId: "conv-2", customerName: "James Wilson", reason: "frustration_detected", reasonDetail: "Customer expressed frustration about repeated wrong item deliveries. Multiple exclamation marks and negative sentiment detected.", confidence: 88, customerMessage: "This is the second time this has happened! Last month I also got the wrong item. I'm very frustrated with your service.", status: "in_progress", createdAt: new Date(Date.now() - 25 * 60000).toISOString() },
  { id: "esc-2", conversationId: "conv-6", customerName: "David Lee", reason: "low_confidence", reasonDetail: "AI confidence dropped below 80% for defective product troubleshooting. Customer reported product failure after 2 days.", confidence: 65, customerMessage: "The product stopped working after 2 days. This is unacceptable quality.", aiResponse: "I'm sorry to hear about this issue. For defective products, we offer a full replacement or refund within 30 days of purchase.", status: "pending", createdAt: new Date(Date.now() - 15 * 60000).toISOString() },
];

export const mockCSStats: CSStats = {
  activeConversations: 4,
  escalatedQueue: 2,
  resolvedToday: 12,
  avgConfidence: 87.5,
  resolutionRate: 94.2,
  avgResponseTime: "< 30s",
  totalHandled: 156,
  aiHandledPercent: 82,
};

export function getCSResponse(message: string): { response: string; confidence: number; shouldEscalate: boolean; escalationReason?: string } {
  const lower = message.toLowerCase();

  if (lower.includes("where") && (lower.includes("order") || lower.includes("track"))) {
    return {
      response: "I'd be happy to help you track your order! Could you please provide your order number? It usually starts with # followed by digits.",
      confidence: 95,
      shouldEscalate: false,
    };
  }
  if (lower.includes("refund") || lower.includes("money back")) {
    return {
      response: "I understand you'd like a refund. Our refund policy allows returns within 30 days of delivery. I can start the process for you right now.\n\nCould you please share:\n1. Your order number\n2. Reason for the refund\n\nOnce confirmed, refunds are processed within 3-5 business days.",
      confidence: 92,
      shouldEscalate: false,
    };
  }
  if (lower.includes("broken") || lower.includes("defective") || lower.includes("doesn't work") || lower.includes("not working")) {
    return {
      response: "I'm sorry to hear about the issue with your product. For defective items, we offer:\n\n1. **Full replacement** shipped immediately\n2. **Complete refund** if you prefer\n\nWhich option would you prefer?",
      confidence: 78,
      shouldEscalate: true,
      escalationReason: "low_confidence",
    };
  }
  if (lower.includes("frustrat") || lower.includes("angry") || lower.includes("terrible") || lower.includes("worst") || lower.includes("unacceptable")) {
    return {
      response: "I completely understand your frustration, and I sincerely apologize for the inconvenience. Your satisfaction is our top priority.\n\nI'm connecting you with a human support agent who can provide personalized assistance right away. They'll have the full context of our conversation.",
      confidence: 60,
      shouldEscalate: true,
      escalationReason: "frustration_detected",
    };
  }
  if (lower.includes("shipping") || lower.includes("delivery")) {
    return {
      response: "Our standard shipping typically takes 7-15 business days depending on your location.\n\n- **Standard:** 10-15 days (free over $50)\n- **Express:** 5-7 days ($4.99)\n- **Premium:** 2-3 days ($12.99)\n\nWould you like me to check the status of a specific order?",
      confidence: 94,
      shouldEscalate: false,
    };
  }
  if (lower.includes("discount") || lower.includes("coupon") || lower.includes("promo")) {
    return {
      response: "Great news! Here are our current offers:\n\n- **WELCOME15** - 15% off your first order\n- **SAVE20** - 20% off orders over $100\n- **FREESHIP** - Free shipping on orders over $50\n\nWould you like me to apply any of these to your current order?",
      confidence: 96,
      shouldEscalate: false,
    };
  }
  return {
    response: "Thank you for reaching out! I'm here to help with:\n\n- Order status and tracking\n- Returns and refunds\n- Product information\n- Shipping questions\n- Discount codes\n\nCould you tell me more about what you need help with?",
    confidence: 85,
    shouldEscalate: false,
  };
}

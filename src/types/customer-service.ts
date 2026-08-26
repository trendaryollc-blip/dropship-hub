export interface Conversation {
  id: string;
  customerName: string;
  customerEmail: string;
  customerAvatar?: string;
  platform: "shopify" | "email" | "live-chat";
  status: "active" | "escalated" | "resolved" | "waiting";
  priority: "low" | "medium" | "high";
  subject: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  aiHandled: boolean;
  escalatedTo?: string;
  tags: string[];
}

export interface CSMessage {
  id: string;
  conversationId: string;
  role: "customer" | "ai" | "agent";
  content: string;
  confidence?: number;
  timestamp: string;
  escalated?: boolean;
  escalationReason?: string;
}

export interface CSTemplate {
  id: string;
  name: string;
  category: "order-status" | "shipping" | "returns" | "product-info" | "general";
  subject: string;
  body: string;
  variables: string[];
  usageCount: number;
  createdAt: string;
}

export interface Escalation {
  id: string;
  conversationId: string;
  customerName: string;
  reason: "low_confidence" | "frustration_detected" | "out_of_scope" | "manual";
  reasonDetail: string;
  confidence: number;
  customerMessage: string;
  aiResponse?: string;
  agentAssigned?: string;
  status: "pending" | "in_progress" | "resolved";
  createdAt: string;
}

export interface CSStats {
  activeConversations: number;
  escalatedQueue: number;
  resolvedToday: number;
  avgConfidence: number;
  resolutionRate: number;
  avgResponseTime: string;
  totalHandled: number;
  aiHandledPercent: number;
}

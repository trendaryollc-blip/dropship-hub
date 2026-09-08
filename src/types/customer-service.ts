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
  sentiment?: SentimentResult;
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
  reason: "low_confidence" | "frustration_detected" | "out_of_scope" | "high_value_order" | "manual";
  reasonDetail: string;
  confidence: number;
  customerMessage: string;
  aiResponse?: string;
  agentAssigned?: string;
  status: "pending" | "in_progress" | "resolved";
  urgencyScore?: number;
  orderValue?: number;
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

export interface SentimentResult {
  score: number;
  label: "positive" | "neutral" | "negative";
  urgency: number;
  emotions: string[];
}

export interface KnowledgeBaseEntry {
  id: string;
  category: "product" | "shipping" | "returns" | "faq" | "policy";
  title: string;
  content: string;
  keywords: string[];
  productId?: string;
  productTitle?: string;
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    minOrderValue?: number;
    minUrgencyScore?: number;
    sentimentThreshold?: number;
    frustrationKeywords?: string[];
    vipCustomer?: boolean;
    messageCount?: number;
    responseCount?: number;
  };
  action: "escalate" | "tag_priority" | "notify_manager" | "auto_respond";
  priority: "low" | "medium" | "high";
  createdAt: string;
}

export interface CSAIResponse {
  response: string;
  confidence: number;
  sentiment: SentimentResult;
  shouldEscalate: boolean;
  escalationReason?: Escalation["reason"];
  matchedKnowledgeBase?: string[];
  suggestedTemplate?: string;
}

export interface CSConfig {
  aiEnabled: boolean;
  autoReply: boolean;
  sentimentAnalysis: boolean;
  knowledgeBaseEnabled: boolean;
  escalationEnabled: boolean;
  maxConfidenceThreshold: number;
  minConfidenceForAutoReply: number;
  customInstructions?: string;
}

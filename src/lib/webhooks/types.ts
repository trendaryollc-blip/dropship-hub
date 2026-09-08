export type WebhookSource = "shopify" | "woocommerce" | "etsy" | "custom";
export type WebhookEvent = "order.created" | "order.updated" | "order.cancelled" | "refund.created" | "inventory.updated" | "product.updated" | "custom";
export type WebhookStatus = "pending" | "processing" | "completed" | "failed" | "retrying";

export interface IncomingWebhook {
  id: string;
  uid: string;
  source: WebhookSource;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  status: WebhookStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutgoingWebhook {
  id: string;
  uid: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  active: boolean;
  retryCount: number;
  lastTriggeredAt?: string;
  lastStatus?: "success" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface OutgoingWebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
  source: string;
}

export interface WebhookLogEntry {
  id: string;
  uid: string;
  direction: "incoming" | "outgoing";
  webhookId: string;
  event: WebhookEvent;
  source: string;
  payload: Record<string, unknown>;
  response?: {
    status: number;
    body?: string;
  };
  error?: string;
  duration: number;
  createdAt: string;
}

export interface WebhookConfig {
  maxRetries: number;
  timeoutMs: number;
  retryDelayMs: number;
}

export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  maxRetries: 3,
  timeoutMs: 30000,
  retryDelayMs: 5000,
};

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  "order.created",
  "order.updated",
  "order.cancelled",
  "refund.created",
  "inventory.updated",
  "product.updated",
  "custom",
];

export const WEBHOOK_SOURCES: WebhookSource[] = ["shopify", "woocommerce", "etsy", "custom"];

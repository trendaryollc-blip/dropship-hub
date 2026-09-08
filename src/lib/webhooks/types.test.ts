import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  IncomingWebhook,
  OutgoingWebhook,
  WebhookLogEntry,
  WebhookEvent,
  WebhookSource,
  WebhookStatus,
  OutgoingWebhookPayload,
  WebhookConfig,
} from "./types";
import {
  WEBHOOK_EVENTS,
  WEBHOOK_SOURCES,
  DEFAULT_WEBHOOK_CONFIG,
} from "./types";

describe("Webhook Types", () => {
  it("defines all webhook events", () => {
    expect(WEBHOOK_EVENTS).toContain("order.created");
    expect(WEBHOOK_EVENTS).toContain("order.updated");
    expect(WEBHOOK_EVENTS).toContain("order.cancelled");
    expect(WEBHOOK_EVENTS).toContain("refund.created");
    expect(WEBHOOK_EVENTS).toContain("inventory.updated");
    expect(WEBHOOK_EVENTS).toContain("product.updated");
    expect(WEBHOOK_EVENTS).toContain("custom");
    expect(WEBHOOK_EVENTS.length).toBe(7);
  });

  it("defines all webhook sources", () => {
    expect(WEBHOOK_SOURCES).toContain("shopify");
    expect(WEBHOOK_SOURCES).toContain("woocommerce");
    expect(WEBHOOK_SOURCES).toContain("etsy");
    expect(WEBHOOK_SOURCES).toContain("custom");
    expect(WEBHOOK_SOURCES.length).toBe(4);
  });

  it("has correct default webhook config", () => {
    expect(DEFAULT_WEBHOOK_CONFIG.maxRetries).toBe(3);
    expect(DEFAULT_WEBHOOK_CONFIG.timeoutMs).toBe(30000);
    expect(DEFAULT_WEBHOOK_CONFIG.retryDelayMs).toBe(5000);
  });
});

describe("Webhook Interfaces", () => {
  it("IncomingWebhook has required fields", () => {
    const webhook: IncomingWebhook = {
      id: "123",
      uid: "user-1",
      source: "shopify",
      event: "order.created",
      payload: { id: 1 },
      headers: { "x-shopify-topic": "orders/create" },
      status: "completed",
      attempts: 1,
      maxAttempts: 3,
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(webhook.id).toBe("123");
    expect(webhook.uid).toBe("user-1");
    expect(webhook.source).toBe("shopify");
    expect(webhook.event).toBe("order.created");
    expect(webhook.status).toBe("completed");
  });

  it("OutgoingWebhook has required fields", () => {
    const webhook: OutgoingWebhook = {
      id: "123",
      uid: "user-1",
      url: "https://example.com/webhook",
      events: ["order.created"],
      secret: "secret-key",
      active: true,
      retryCount: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(webhook.id).toBe("123");
    expect(webhook.url).toBe("https://example.com/webhook");
    expect(webhook.active).toBe(true);
    expect(webhook.secret).toBe("secret-key");
  });

  it("WebhookLogEntry has required fields", () => {
    const log: WebhookLogEntry = {
      id: "123",
      uid: "user-1",
      direction: "incoming",
      webhookId: "wh-123",
      event: "order.created",
      source: "shopify",
      payload: { id: 1 },
      duration: 150,
      createdAt: new Date().toISOString(),
    };

    expect(log.direction).toBe("incoming");
    expect(log.duration).toBe(150);
  });

  it("OutgoingWebhookPayload has correct structure", () => {
    const payload: OutgoingWebhookPayload = {
      event: "order.created",
      timestamp: new Date().toISOString(),
      data: { orderId: "123" },
      source: "dropship-hub",
    };

    expect(payload.event).toBe("order.created");
    expect(payload.source).toBe("dropship-hub");
    expect(payload.data.orderId).toBe("123");
  });
});

describe("Webhook Validation", () => {
  it("accepts valid webhook events", () => {
    const validEvents: WebhookEvent[] = [
      "order.created",
      "order.updated",
      "order.cancelled",
      "refund.created",
      "inventory.updated",
      "product.updated",
      "custom",
    ];

    for (const event of validEvents) {
      expect(WEBHOOK_EVENTS).toContain(event);
    }
  });

  it("accepts valid webhook sources", () => {
    const validSources: WebhookSource[] = ["shopify", "woocommerce", "etsy", "custom"];
    for (const source of validSources) {
      expect(WEBHOOK_SOURCES).toContain(source);
    }
  });

  it("accepts valid webhook statuses", () => {
    const validStatuses: WebhookStatus[] = ["pending", "processing", "completed", "failed", "retrying"];
    for (const status of validStatuses) {
      expect(["pending", "processing", "completed", "failed", "retrying"]).toContain(status);
    }
  });
});

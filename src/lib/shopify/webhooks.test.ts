import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

const originalEnv = { ...process.env };

function generateHmac(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("verifyShopifyWebhook", () => {
  it("returns true for valid HMAC signature", async () => {
    process.env.SHOPIFY_WEBHOOK_SECRET = "test_secret_123";
    const { verifyShopifyWebhook } = await import("./webhooks");
    const body = '{"id":1,"title":"Test"}';
    const hmac = generateHmac(body, "test_secret_123");
    expect(verifyShopifyWebhook(body, hmac)).toBe(true);
  });

  it("returns false for invalid HMAC signature", async () => {
    process.env.SHOPIFY_WEBHOOK_SECRET = "test_secret_123";
    const { verifyShopifyWebhook } = await import("./webhooks");
    const body = '{"id":1,"title":"Test"}';
    expect(verifyShopifyWebhook(body, "invalid_hmac_value_here")).toBe(false);
  });

  it("returns true when no secret configured (permissive default)", async () => {
    delete process.env.SHOPIFY_WEBHOOK_SECRET;
    const { verifyShopifyWebhook } = await import("./webhooks");
    expect(verifyShopifyWebhook("any body", "any_hmac")).toBe(true);
  });

  it("returns false for empty HMAC when secret exists", async () => {
    process.env.SHOPIFY_WEBHOOK_SECRET = "test_secret_123";
    const { verifyShopifyWebhook } = await import("./webhooks");
    expect(verifyShopifyWebhook("body", "")).toBe(false);
  });

  it("uses custom secret parameter over env", async () => {
    process.env.SHOPIFY_WEBHOOK_SECRET = "env_secret";
    const { verifyShopifyWebhook } = await import("./webhooks");
    const body = "test";
    const hmac = generateHmac(body, "custom_secret");
    expect(verifyShopifyWebhook(body, hmac, "custom_secret")).toBe(true);
  });
});

describe("registerShopifyWebhooks", () => {
  it("registers missing webhooks", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ webhooks: [] }),
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ webhook: { id: 1 } }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const { registerShopifyWebhooks } = await import("./webhooks");
    const result = await registerShopifyWebhooks("test.myshopify.com", "shpat_token", "https://app.example.com");

    expect(result.registered.length).toBe(7);
    expect(result.failed.length).toBe(0);
    expect(mockFetch).toHaveBeenCalled();
  });

  it("skips already registered webhooks", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        webhooks: [
          { id: 1, topic: "orders/create", address: "https://app.example.com/api/webhooks/shopify" },
          { id: 2, topic: "products/create", address: "https://app.example.com/api/webhooks/shopify" },
        ],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { registerShopifyWebhooks } = await import("./webhooks");
    const result = await registerShopifyWebhooks("test.myshopify.com", "shpat_token", "https://app.example.com");

    expect(result.registered.length).toBe(7);
    expect(result.failed.length).toBe(0);
  });

  it("reports failures for individual webhooks", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ webhooks: [] }) });
      }
      if (callCount <= 3) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ webhook: { id: 1 } }) });
      }
      return Promise.resolve({ ok: false, status: 429, text: () => Promise.resolve("rate limited") });
    });
    vi.stubGlobal("fetch", mockFetch);

    const { registerShopifyWebhooks } = await import("./webhooks");
    const result = await registerShopifyWebhooks("test.myshopify.com", "shpat_token", "https://app.example.com");

    expect(result.registered.length).toBeGreaterThan(0);
    expect(result.failed.length).toBeGreaterThan(0);
  });

  it("throws when listing existing webhooks fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("unauthorized"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { registerShopifyWebhooks } = await import("./webhooks");
    await expect(
      registerShopifyWebhooks("test.myshopify.com", "bad_token", "https://app.example.com")
    ).rejects.toThrow("Shopify API 401");
  });
});

describe("unregisterShopifyWebhooks", () => {
  it("removes webhooks matching app base URL", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          webhooks: [
            { id: 100, topic: "orders/create", address: "https://app.example.com/api/webhooks/shopify" },
            { id: 101, topic: "products/create", address: "https://app.example.com/api/webhooks/shopify" },
          ],
        }),
      })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", mockFetch);

    const { unregisterShopifyWebhooks } = await import("./webhooks");
    const result = await unregisterShopifyWebhooks("test.myshopify.com", "shpat_token");

    expect(result.removed).toBe(2);
    expect(result.errors.length).toBe(0);
  });

  it("does not remove webhooks from other apps", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        webhooks: [
          { id: 200, topic: "orders/create", address: "https://other-app.com/webhook" },
        ],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { unregisterShopifyWebhooks } = await import("./webhooks");
    const result = await unregisterShopifyWebhooks("test.myshopify.com", "shpat_token");

    expect(result.removed).toBe(0);
  });

  it("handles errors when listing webhooks fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("server error"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { unregisterShopifyWebhooks } = await import("./webhooks");
    const result = await unregisterShopifyWebhooks("test.myshopify.com", "shpat_token");

    expect(result.removed).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("Failed to list webhooks");
  });

  it("handles partial deletion failures", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          webhooks: [
            { id: 300, topic: "orders/create", address: "https://app.example.com/api/webhooks/shopify" },
            { id: 301, topic: "products/create", address: "https://app.example.com/api/webhooks/shopify" },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("error") });
    vi.stubGlobal("fetch", mockFetch);

    const { unregisterShopifyWebhooks } = await import("./webhooks");
    const result = await unregisterShopifyWebhooks("test.myshopify.com", "shpat_token");

    expect(result.removed).toBe(1);
    expect(result.errors.length).toBe(1);
  });
});

describe("listShopifyWebhooks", () => {
  it("returns list of webhooks", async () => {
    const mockWebhooks = [
      { id: 1, topic: "orders/create", address: "https://app.example.com/webhook", format: "json", created_at: "2024-01-01", updated_at: "2024-01-01" },
      { id: 2, topic: "products/create", address: "https://app.example.com/webhook", format: "json", created_at: "2024-01-01", updated_at: "2024-01-01" },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ webhooks: mockWebhooks }),
    }));

    const { listShopifyWebhooks } = await import("./webhooks");
    const result = await listShopifyWebhooks("test.myshopify.com", "shpat_token");

    expect(result.length).toBe(2);
    expect(result[0].topic).toBe("orders/create");
  });

  it("returns empty array when no webhooks exist", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ webhooks: [] }),
    }));

    const { listShopifyWebhooks } = await import("./webhooks");
    const result = await listShopifyWebhooks("test.myshopify.com", "shpat_token");

    expect(result.length).toBe(0);
  });
});

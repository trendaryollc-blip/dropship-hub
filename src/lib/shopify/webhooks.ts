import crypto from "crypto";

const SHOPIFY_API_VERSION = "2024-01";

export const SHOPIFY_WEBHOOK_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/cancelled",
  "products/create",
  "products/update",
  "products/delete",
  "inventory_levels/update",
] as const;

export type ShopifyWebhookTopic = (typeof SHOPIFY_WEBHOOK_TOPICS)[number];

interface ShopifyWebhook {
  id: number;
  topic: string;
  address: string;
  format: string;
  created_at: string;
  updated_at: string;
}

interface ShopifyWebhooksListResponse {
  webhooks: ShopifyWebhook[];
}

async function shopifyAdminFetch(
  shopDomain: string,
  accessToken: string,
  endpoint: string,
  options?: RequestInit
): Promise<unknown> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
        ...options?.headers,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API ${res.status}: ${text}`);
  }

  return res.json();
}

export async function registerShopifyWebhooks(
  shopDomain: string,
  accessToken: string,
  webhookBaseUrl: string
): Promise<{ registered: string[]; failed: string[] }> {
  const registered: string[] = [];
  const failed: string[] = [];

  const existing = (await shopifyAdminFetch(
    shopDomain,
    accessToken,
    "/webhooks.json"
  )) as ShopifyWebhooksListResponse;

  const existingTopics = new Set(
    (existing.webhooks || []).map((w) => w.topic)
  );

  for (const topic of SHOPIFY_WEBHOOK_TOPICS) {
    if (existingTopics.has(topic)) {
      registered.push(topic);
      continue;
    }

    try {
      await shopifyAdminFetch(shopDomain, accessToken, "/webhooks.json", {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            topic,
            address: `${webhookBaseUrl}/api/webhooks/shopify`,
            format: "json",
          },
        }),
      });
      registered.push(topic);
    } catch (err) {
      console.error(`Failed to register webhook ${topic}:`, err);
      failed.push(topic);
    }
  }

  return { registered, failed };
}

export async function unregisterShopifyWebhooks(
  shopDomain: string,
  accessToken: string
): Promise<{ removed: number; errors: string[] }> {
  const errors: string[] = [];
  let removed = 0;

  try {
    const data = (await shopifyAdminFetch(
      shopDomain,
      accessToken,
      "/webhooks.json"
    )) as ShopifyWebhooksListResponse;

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dropship-hub-gamma.vercel.app";

    for (const webhook of data.webhooks || []) {
      if (webhook.address?.includes(appBaseUrl)) {
        try {
          await shopifyAdminFetch(
            shopDomain,
            accessToken,
            `/webhooks/${webhook.id}.json`,
            { method: "DELETE" }
          );
          removed++;
        } catch (err) {
          errors.push(`Failed to delete webhook ${webhook.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  } catch (err) {
    errors.push(`Failed to list webhooks: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { removed, errors };
}

export async function listShopifyWebhooks(
  shopDomain: string,
  accessToken: string
): Promise<ShopifyWebhook[]> {
  const data = (await shopifyAdminFetch(
    shopDomain,
    accessToken,
    "/webhooks.json"
  )) as ShopifyWebhooksListResponse;
  return data.webhooks || [];
}

export function verifyShopifyWebhook(
  body: string,
  hmacHeader: string,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.SHOPIFY_WEBHOOK_SECRET || "";
  if (!webhookSecret) return true;

  const hash = crypto
    .createHmac("sha256", webhookSecret)
    .update(body, "utf8")
    .digest("base64");

  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader || ""));
  } catch {
    return false;
  }
}

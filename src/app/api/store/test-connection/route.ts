import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/api-errors";

async function testShopifyConnection(domain: string, accessToken: string): Promise<{ ok: boolean; message: string }> {
  const cleanDomain = domain.replace("https://", "").replace("http://", "").replace(/\/$/, "");
  const res = await fetch(`https://${cleanDomain}/admin/api/2024-01/shop.json`, {
    headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { ok: false, message: `Shopify API returned ${res.status}: ${res.statusText}` };
  const data = await res.json();
  const shop = data.shop;
  return { ok: true, message: `Connected to ${shop?.name || cleanDomain}` };
}

async function testWooCommerceConnection(url: string, apiKey: string, apiSecret: string): Promise<{ ok: boolean; message: string }> {
  const baseUrl = url.replace(/\/$/, "");
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const res = await fetch(`${baseUrl}/wp-json/wc/v3/system_status`, {
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { ok: false, message: `WooCommerce API returned ${res.status}: ${res.statusText}` };
  return { ok: true, message: `Connected to WooCommerce store at ${baseUrl}` };
}

async function testEtsyConnection(apiKey: string, shopId: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}`, {
    headers: { "x-api-key": apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { ok: false, message: `Etsy API returned ${res.status}: ${res.statusText}` };
  const data = await res.json();
  return { ok: true, message: `Connected to Etsy shop: ${data.shop_name || shopId}` };
}

async function testTrendaryoConnection(url: string, apiKey: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${url}/api/health`, {
    headers: { "x-api-key": apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { ok: false, message: `Trendaryo API returned ${res.status}: ${res.statusText}` };
  return { ok: true, message: "Connected to Trendaryo store" };
}

async function testBigCommerceConnection(storeHash: string, accessToken: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`https://api.bigcommerce.com/stores/${storeHash}/v3/storefront/api-token`, {
    headers: { "X-Auth-Token": accessToken, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { ok: false, message: `BigCommerce API returned ${res.status}: ${res.statusText}` };
  return { ok: true, message: `Connected to BigCommerce store: ${storeHash}` };
}

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { platform, url, storeDomain, apiKey, apiSecret, accessToken, storeHash, shopId } = body as Record<string, string>;

    if (!platform) {
      return NextResponse.json({ ok: false, message: "Platform is required" }, { status: 400 });
    }

    let result: { ok: boolean; message: string };

    switch (platform) {
      case "shopify":
        result = await testShopifyConnection(storeDomain || url || "", accessToken || apiKey || "");
        break;
      case "woocommerce":
        result = await testWooCommerceConnection(url || "", apiKey || "", apiSecret || "");
        break;
      case "etsy":
        result = await testEtsyConnection(apiKey || "", shopId || "");
        break;
      case "trendaryo":
        result = await testTrendaryoConnection(url || "", apiKey || "");
        break;
      case "bigcommerce":
        result = await testBigCommerceConnection(storeHash || "", accessToken || apiKey || "");
        break;
      default:
        result = { ok: false, message: `Platform "${platform}" does not support connection testing yet` };
    }

    return NextResponse.json(result);
  } catch (error) {
    const msg = safeErrorMessage(error, "Connection test failed");
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}, LIMITS.DEFAULT);

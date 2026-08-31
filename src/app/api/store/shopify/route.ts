import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function shopifyFetch(endpoint: string, options?: RequestInit) {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    throw new Error("Shopify credentials not configured");
  }

  const res = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Shopify API ${res.status}: ${error}`);
  }

  return res.json();
}

async function getShopInfo() {
  return shopifyFetch("/shop.json");
}

async function getProducts(page = 1, limit = 20) {
  return shopifyFetch(`/products.json?page=${page}&limit=${limit}`);
}

async function getProduct(productId: string) {
  return shopifyFetch(`/products/${productId}.json`);
}

async function createProduct(product: Record<string, unknown>) {
  return shopifyFetch("/products.json", {
    method: "POST",
    body: JSON.stringify({ product }),
  });
}

async function updateProduct(productId: string, product: Record<string, unknown>) {
  return shopifyFetch(`/products/${productId}.json`, {
    method: "PUT",
    body: JSON.stringify({ product }),
  });
}

async function deleteProduct(productId: string) {
  return shopifyFetch(`/products/${productId}.json`, {
    method: "DELETE",
  });
}

async function getOrders(page = 1, limit = 20) {
  return shopifyFetch(`/orders.json?page=${page}&limit=${limit}&status=any`);
}

async function getCustomers(page = 1, limit = 20) {
  return shopifyFetch(`/customers.json?page=${page}&limit=${limit}`);
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { action, productId, product, page, limit } = await request.json();

    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "Shopify not configured. Add SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN to .env.local" },
        { status: 503 }
      );
    }

    let data;

    switch (action) {
      case "shop":
        data = await getShopInfo();
        break;
      case "products":
        data = await getProducts(page, limit);
        break;
      case "product":
        data = await getProduct(productId);
        break;
      case "create":
        data = await createProduct(product);
        break;
      case "update":
        data = await updateProduct(productId, product);
        break;
      case "delete":
        data = await deleteProduct(productId);
        break;
      case "orders":
        data = await getOrders(page, limit);
        break;
      case "customers":
        data = await getCustomers(page, limit);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ data, source: "shopify" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Shopify API request failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const GET = withAuth(async () => {
  return NextResponse.json({
    platform: "Shopify",
    configured: !!(SHOPIFY_STORE_DOMAIN && SHOPIFY_ACCESS_TOKEN),
  });
}, LIMITS.DEFAULT);

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

const WOOCOMMERCE_URL = process.env.WOOCOMMERCE_URL;
const WOOCOMMERCE_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const WOOCOMMERCE_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

async function wooCommerceFetch(endpoint: string, options?: RequestInit) {
  if (!WOOCOMMERCE_URL || !WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET) {
    throw new Error("WooCommerce credentials not configured");
  }

  const url = new URL(`${WOOCOMMERCE_URL}/wp-json/wc/v3${endpoint}`);
  const credentials = Buffer.from(`${WOOCOMMERCE_CONSUMER_KEY}:${WOOCOMMERCE_CONSUMER_SECRET}`).toString("base64");

  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`WooCommerce API ${res.status}: ${error}`);
  }

  return res.json();
}

async function getStoreInfo() {
  return wooCommerceFetch("/system_status");
}

async function getProducts(page = 1, perPage = 20) {
  return wooCommerceFetch(`/products?page=${page}&per_page=${perPage}`);
}

async function getProduct(productId: number) {
  return wooCommerceFetch(`/products/${productId}`);
}

async function createProduct(product: Record<string, unknown>) {
  return wooCommerceFetch("/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

async function updateProduct(productId: number, product: Record<string, unknown>) {
  return wooCommerceFetch(`/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
}

async function deleteProduct(productId: number, force = true) {
  return wooCommerceFetch(`/products/${productId}?force=${force}`, {
    method: "DELETE",
  });
}

async function getOrders(page = 1, perPage = 20) {
  return wooCommerceFetch(`/orders?page=${page}&per_page=${perPage}`);
}

async function getCustomers(page = 1, perPage = 20) {
  return wooCommerceFetch(`/customers?page=${page}&per_page=${perPage}`);
}

async function getCategories(page = 1, perPage = 100) {
  return wooCommerceFetch(`/products/categories?page=${page}&per_page=${perPage}`);
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { action, productId, product, page, perPage, force } = await request.json();

    if (!WOOCOMMERCE_URL || !WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET) {
      return NextResponse.json(
        { error: "WooCommerce not configured. Add WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET to .env.local" },
        { status: 503 }
      );
    }

    let data;

    switch (action) {
      case "shop":
        data = await getStoreInfo();
        break;
      case "products":
        data = await getProducts(page, perPage);
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
        data = await deleteProduct(productId, force);
        break;
      case "orders":
        data = await getOrders(page, perPage);
        break;
      case "customers":
        data = await getCustomers(page, perPage);
        break;
      case "categories":
        data = await getCategories(page, perPage);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ data, source: "woocommerce" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WooCommerce API request failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const GET = withAuth(async () => {
  return NextResponse.json({
    platform: "WooCommerce",
    configured: !!(WOOCOMMERCE_URL && WOOCOMMERCE_CONSUMER_KEY && WOOCOMMERCE_CONSUMER_SECRET),
  });
}, LIMITS.DEFAULT);

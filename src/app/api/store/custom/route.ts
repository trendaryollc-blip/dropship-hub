import { NextRequest, NextResponse } from "next/server";

interface CustomStoreRequest {
  action: "test" | "products" | "orders" | "customers" | "sync";
  url?: string;
  apiKey?: string;
  productsEndpoint?: string;
  ordersEndpoint?: string;
  customersEndpoint?: string;
}

async function fetchCustomStore(
  storeUrl: string,
  endpoint: string,
  apiKey?: string,
) {
  const url = new URL(endpoint, storeUrl).toString();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
    headers["X-API-Key"] = apiKey;
  }

  const res = await fetch(url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Store returned ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

async function testConnection(
  storeUrl: string,
  apiKey?: string,
  productsEndpoint?: string,
) {
  const endpoint = productsEndpoint || "/api/products";

  try {
    const data = await fetchCustomStore(storeUrl, endpoint, apiKey);

    const productCount =
      Array.isArray(data)
        ? data.length
        : data.products?.length ??
          data.data?.length ??
          data.items?.length ??
          data.results?.length ??
          0;

    return { connected: true, productCount, raw: data };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function fetchProducts(
  storeUrl: string,
  apiKey?: string,
  productsEndpoint?: string,
) {
  const endpoint = productsEndpoint || "/api/products";
  return fetchCustomStore(storeUrl, endpoint, apiKey);
}

async function fetchOrders(
  storeUrl: string,
  apiKey?: string,
  ordersEndpoint?: string,
) {
  const endpoint = ordersEndpoint || "/api/orders";
  return fetchCustomStore(storeUrl, endpoint, apiKey);
}

async function fetchCustomers(
  storeUrl: string,
  apiKey?: string,
  customersEndpoint?: string,
) {
  const endpoint = customersEndpoint || "/api/customers";
  return fetchCustomStore(storeUrl, endpoint, apiKey);
}

async function syncStore(
  storeUrl: string,
  apiKey?: string,
  productsEndpoint?: string,
) {
  const products = await fetchProducts(storeUrl, apiKey, productsEndpoint);

  const productList = Array.isArray(products)
    ? products
    : products.products ?? products.data ?? products.items ?? products.results ?? [];

  const summary = {
    productCount: productList.length,
    syncedAt: new Date().toISOString(),
    sample: productList.slice(0, 5),
  };

  return summary;
}

export async function POST(request: NextRequest) {
  try {
    const body: CustomStoreRequest = await request.json();
    const {
      action,
      url: storeUrl,
      apiKey,
      productsEndpoint,
      ordersEndpoint,
      customersEndpoint,
    } = body;

    if (!storeUrl) {
      return NextResponse.json({ error: "Store URL is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(storeUrl);
    } catch {
      return NextResponse.json({ error: "Invalid store URL" }, { status: 400 });
    }

    let data;

    switch (action) {
      case "test":
        data = await testConnection(storeUrl, apiKey, productsEndpoint);
        if (!data.connected) {
          return NextResponse.json({ error: data.error, data }, { status: 502 });
        }
        break;
      case "products":
        data = await fetchProducts(storeUrl, apiKey, productsEndpoint);
        break;
      case "orders":
        data = await fetchOrders(storeUrl, apiKey, ordersEndpoint);
        break;
      case "customers":
        data = await fetchCustomers(storeUrl, apiKey, customersEndpoint);
        break;
      case "sync":
        data = await syncStore(storeUrl, apiKey, productsEndpoint);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ data, source: "custom", storeUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Custom store request failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    platform: "Custom Store",
    description: "Connect any store built from scratch",
    supportedActions: ["test", "products", "orders", "customers", "sync"],
  });
}

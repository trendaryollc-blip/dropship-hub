import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

const BACKEND_URL = process.env.TRENDARYO_API_URL || "https://trendaryo-llc-backend.vercel.app";
const API_KEY = process.env.TRENDARYO_API_KEY || "";

function getHeaders(authToken?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["x-api-key"] = authToken;
  } else if (API_KEY) {
    headers["x-api-key"] = API_KEY;
  }
  return headers;
}

async function proxyRequest(
  path: string,
  method: string,
  body?: unknown,
  authToken?: string,
) {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: getHeaders(authToken),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const action = request.nextUrl.searchParams.get("action");
    const authToken = request.nextUrl.searchParams.get("authToken") || undefined;

    switch (action) {
      case "products": {
        const category = request.nextUrl.searchParams.get("category") || undefined;
        const search = request.nextUrl.searchParams.get("search") || undefined;
        const limit = request.nextUrl.searchParams.get("limit") || "50";
        const offset = request.nextUrl.searchParams.get("offset") || "0";
        const minPrice = request.nextUrl.searchParams.get("minPrice") || undefined;
        const maxPrice = request.nextUrl.searchParams.get("maxPrice") || undefined;

        let path = `/api/products?limit=${limit}&offset=${offset}`;
        if (category) path += `&category=${encodeURIComponent(category)}`;
        if (search) path += `&search=${encodeURIComponent(search)}`;
        if (minPrice) path += `&minPrice=${minPrice}`;
        if (maxPrice) path += `&maxPrice=${maxPrice}`;

        const result = await proxyRequest(path, "GET", undefined, authToken);
        return NextResponse.json(result.data, { status: result.status });
      }

      case "orders": {
        const limit = request.nextUrl.searchParams.get("limit") || "50";
        const offset = request.nextUrl.searchParams.get("offset") || "0";
        const result = await proxyRequest(
          `/api/orders?limit=${limit}&offset=${offset}`,
          "GET",
          undefined,
          authToken,
        );
        return NextResponse.json(result.data, { status: result.status });
      }

      case "product": {
        const id = request.nextUrl.searchParams.get("id");
        if (!id) {
          return NextResponse.json({ error: "Product id required" }, { status: 400 });
        }
        const result = await proxyRequest(`/api/products/${id}`, "GET", undefined, authToken);
        return NextResponse.json(result.data, { status: result.status });
      }

      case "health": {
        const result = await proxyRequest("/health", "GET");
        return NextResponse.json(result.data, { status: result.status });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trendaryo request failed" },
      { status: 500 },
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, authToken, ...payload } = body;

    switch (action) {
      case "createProduct": {
        const result = await proxyRequest("/api/products", "POST", payload, authToken);
        return NextResponse.json(result.data, { status: result.status });
      }

      case "updateProduct": {
        const { id, ...updates } = payload;
        if (!id) {
          return NextResponse.json({ error: "Product id required" }, { status: 400 });
        }
        const result = await proxyRequest(`/api/products/${id}`, "PUT", updates, authToken);
        return NextResponse.json(result.data, { status: result.status });
      }

      case "deleteProduct": {
        const { id } = payload;
        if (!id) {
          return NextResponse.json({ error: "Product id required" }, { status: 400 });
        }
        const result = await proxyRequest(`/api/products/${id}`, "DELETE", undefined, authToken);
        return NextResponse.json(result.data, { status: result.status });
      }

      case "createOrder": {
        const result = await proxyRequest("/api/orders", "POST", payload, authToken);
        return NextResponse.json(result.data, { status: result.status });
      }

      case "syncProducts": {
        const result = await proxyRequest("/api/products?limit=100", "GET", undefined, authToken);
        return NextResponse.json(result.data, { status: result.status });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trendaryo request failed" },
      { status: 500 },
    );
  }
}, LIMITS.DEFAULT);

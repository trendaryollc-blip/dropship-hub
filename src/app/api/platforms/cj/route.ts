import { NextRequest, NextResponse } from "next/server";
import { searchCJProducts } from "@/lib/platform-search";

const CJ_API_KEY = process.env.CJ_API_KEY;

async function getCJAccessToken() {
  if (!CJ_API_KEY) throw new Error("CJ_API_KEY not configured");
  if (CJ_API_KEY.startsWith("MCP@")) return CJ_API_KEY;
  const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: CJ_API_KEY }),
  });
  if (!res.ok) throw new Error(`CJ Auth ${res.status}`);
  const data = await res.json();
  return data.data?.accessToken;
}

export async function POST(request: NextRequest) {
  try {
    const { query, action, productId } = await request.json();
    if (!CJ_API_KEY) {
      return NextResponse.json({ error: "CJ API key not configured" }, { status: 503 });
    }

    const accessToken = await getCJAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Failed to authenticate with CJ" }, { status: 503 });
    }

    if (action === "detail" && productId) {
      const res = await fetch(
        `https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${productId}`,
        { method: "GET", headers: { "CJ-Access-Token": accessToken, "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error(`CJ Product ${res.status}`);
      const data = await res.json();
      return NextResponse.json({ data, source: "cj", action: "detail" });
    }

    if (action === "categories") {
      const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/getCategory", {
        method: "GET",
        headers: { "CJ-Access-Token": accessToken, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`CJ Categories ${res.status}`);
      const data = await res.json();
      return NextResponse.json({ data, source: "cj", action: "categories" });
    }

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const data = await searchCJProducts(query);
    return NextResponse.json({ data, source: "cj", query });
  } catch {
    return NextResponse.json({ error: "CJ API request failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    platform: "CJ Dropshipping",
    configured: !!CJ_API_KEY,
  });
}

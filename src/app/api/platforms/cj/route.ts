import { NextRequest, NextResponse } from "next/server";

const CJ_API_KEY = process.env.CJ_API_KEY;
const CJ_EMAIL = process.env.CJ_EMAIL;
const CJ_PASSWORD = process.env.CJ_PASSWORD;

async function getCJAccessToken() {
  if (!CJ_EMAIL || !CJ_PASSWORD) {
    throw new Error("CJ_EMAIL and CJ_PASSWORD must be configured in .env.local");
  }
  const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CJ_EMAIL, password: CJ_PASSWORD }),
  });
  if (!res.ok) throw new Error(`CJ Auth ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data?.accessToken;
}

async function searchCJProducts(query: string, accessToken: string) {
  const res = await fetch(
    `https://developers.cjdropshipping.com/api2.0/v1/product/list?productNameEn=${encodeURIComponent(query)}&pageNum=1&pageSize=20`,
    {
      method: "GET",
      headers: {
        "CJ-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) throw new Error(`CJ Products ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getCJProductDetail(productId: string, accessToken: string) {
  const res = await fetch(
    `https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${productId}`,
    {
      method: "GET",
      headers: {
        "CJ-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) throw new Error(`CJ Product ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getCJCategories(accessToken: string) {
  const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/getCategory", {
    method: "GET",
    headers: {
      "CJ-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`CJ Categories ${res.status}: ${await res.text()}`);
  return res.json();
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
      const data = await getCJProductDetail(productId, accessToken);
      return NextResponse.json({ data, source: "cj", action: "detail" });
    }

    if (action === "categories") {
      const data = await getCJCategories(accessToken);
      return NextResponse.json({ data, source: "cj", action: "categories" });
    }

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const data = await searchCJProducts(query, accessToken);
    return NextResponse.json({ data, source: "cj", query });
  } catch {
    return NextResponse.json({ error: "CJ API request failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    platform: "CJ Dropshipping",
    configured: !!(CJ_API_KEY && CJ_EMAIL && CJ_PASSWORD),
  });
}

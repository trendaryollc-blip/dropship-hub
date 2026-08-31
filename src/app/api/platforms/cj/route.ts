import { NextRequest, NextResponse } from "next/server";
import { searchCJProducts } from "@/lib/platform-search";
import { withAuth } from "@/lib/auth";
import { getCJAccessToken } from "@/lib/cj-auth";

const CJ_API_KEY = process.env.CJ_API_KEY;

export const POST = withAuth(async (request: NextRequest, uid: string) => {
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
});

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  return NextResponse.json({
    platform: "CJ Dropshipping",
    configured: !!CJ_API_KEY,
  });
});

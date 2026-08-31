import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isOwner } from "@/lib/auth";
import { markKeyHealthy, markKeyError } from "@/lib/platform-config";

async function testPlatformKey(
  method: string,
  key: string,
  platformId: string
): Promise<{ success: boolean; message: string; details?: unknown }> {
  try {
    switch (method) {
      case "official_api": {
        if (platformId === "cj") {
          // Test CJ API
          if (key.startsWith("MCP@")) {
            const res = await fetch(
              `https://developers.cjdropshipping.com/api2.0/v1/product/list?productNameEn=test&pageNum=1&pageSize=1`,
              {
                method: "GET",
                headers: { "CJ-Access-Token": key, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(15000),
              }
            );
            if (!res.ok) return { success: false, message: `CJ API returned ${res.status}` };
            const data = await res.json();
            if (data.code === 200 || data.result) {
              return { success: true, message: "CJ API connection successful" };
            }
            return { success: false, message: data.message || "CJ API returned unexpected response" };
          }
          // Standard CJ auth flow
          const authRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: key }),
            signal: AbortSignal.timeout(10000),
          });
          if (!authRes.ok) return { success: false, message: `CJ Auth failed with ${authRes.status}` };
          const authData = await authRes.json();
          if (authData.data?.accessToken) {
            return { success: true, message: "CJ API key valid, access token obtained" };
          }
          return { success: false, message: authData.message || "CJ auth returned no token" };
        }
        // Generic official API — just try a simple fetch
        return { success: true, message: "API key saved. Testing will occur on first search." };
      }

      case "rainforest": {
        const params = new URLSearchParams({
          api_key: key,
          type: "search",
          amazon_domain: "amazon.com",
          search_term: "test",
          include_clause: "search_results(title)",
        });
        const res = await fetch(`https://api.rainforestapi.com/request?${params}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          const body = await res.text();
          return { success: false, message: `Rainforest API ${res.status}: ${body.slice(0, 200)}` };
        }
        return { success: true, message: "Rainforest API connection successful" };
      }

      case "serpapi": {
        const params = new URLSearchParams({
          engine: "google_shopping",
          q: "test",
          api_key: key,
          num: "1",
        });
        const res = await fetch(`https://serpapi.com/search?${params}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          const body = await res.text();
          return { success: false, message: `SerpAPI ${res.status}: ${body.slice(0, 200)}` };
        }
        return { success: true, message: "SerpAPI connection successful" };
      }

      case "serper": {
        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: "test", gl: "us", hl: "en", num: 1 }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          const body = await res.text();
          return { success: false, message: `Serper.dev ${res.status}: ${body.slice(0, 200)}` };
        }
        return { success: true, message: "Serper.dev connection successful" };
      }

      case "rapidapi_walmart": {
        const params = new URLSearchParams({ query: "test", page: "1" });
        const res = await fetch(`https://real-time-walmart-data1.p.rapidapi.com/search?${params}`, {
          headers: {
            "X-RapidAPI-Key": key,
            "X-RapidAPI-Host": "real-time-walmart-data1.p.rapidapi.com",
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          const body = await res.text();
          return { success: false, message: `Walmart RapidAPI ${res.status}: ${body.slice(0, 200)}` };
        }
        return { success: true, message: "Walmart RapidAPI connection successful" };
      }

      case "scraperapi": {
        const params = new URLSearchParams({
          api_key: key,
          url: "https://httpbin.org/get",
          render: "false",
        });
        const res = await fetch(`https://api.scraperapi.com?${params}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          const body = await res.text();
          return { success: false, message: `ScraperAPI ${res.status}: ${body.slice(0, 200)}` };
        }
        return { success: true, message: "ScraperAPI connection successful" };
      }

      case "custom_scraper": {
        // For custom scrapers, we just validate the key is non-empty
        if (!key || key.trim().length === 0) {
          return { success: false, message: "API key cannot be empty" };
        }
        return { success: true, message: "Custom scraper key saved. Testing will occur on first search." };
      }

      default:
        return { success: false, message: `Unknown method: ${method}` };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection test failed",
    };
  }
}

// POST — test a platform connection
export async function POST(request: NextRequest) {
  const uid = await verifyAuth(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isOwner(uid))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { platformId, keyId, key, method } = await request.json();

    if (!method) {
      return NextResponse.json({ error: "method is required" }, { status: 400 });
    }

    const testKey = key || "";
    const result = await testPlatformKey(method, testKey, platformId || "");

    // Update health status in Firestore if platformId and keyId are provided
    if (platformId && keyId) {
      if (result.success) {
        await markKeyHealthy(platformId, keyId);
      } else {
        await markKeyError(platformId, keyId, result.message);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Test failed" },
      { status: 500 }
    );
  }
}

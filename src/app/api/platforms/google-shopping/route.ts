import { NextRequest, NextResponse } from "next/server";
import { searchGoogleShopping } from "@/lib/platform-search";
import { withAuth } from "@/lib/auth";
import { safeErrorMessage } from "@/lib/api-errors";
import { getPoolKeys } from "@/lib/api-keys/pool";
import { configMissingEnvelope, envelopeFromError, envelopeToResponse } from "@/lib/api-keys/envelope";

export const POST = withAuth(async (request: NextRequest, _uid: string) => {
  try {
    const { query } = await request.json();

    if (getPoolKeys("serpapi").length === 0) {
      return envelopeToResponse(configMissingEnvelope("serpapi", "SerpAPI key for Google Shopping search"));
    }

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const data = await searchGoogleShopping(query);
    return NextResponse.json({ data, source: "google_shopping", query });
  } catch (error) {
    const env = envelopeFromError(error, "serpapi");
    if (env.meta.status === "config_missing" || env.meta.status === "quota_exhausted") {
      return envelopeToResponse(env);
    }
    return NextResponse.json({ error: safeErrorMessage(error, "Google Shopping search failed") }, { status: 500 });
  }
});

export const GET = withAuth(async (_request: NextRequest, _uid: string) => {
  return NextResponse.json({ platform: "Google Shopping", configured: getPoolKeys("serpapi").length > 0 });
});

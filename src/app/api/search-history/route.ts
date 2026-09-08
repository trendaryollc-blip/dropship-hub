import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const limitCount = Math.min(parseInt(url.searchParams.get("limit") || "15", 10), 50);

    const collectionName = type === "competitor" ? "competitorSearches" : "searchHistory";

    const snap = await db
      .collection("users")
      .doc(uid)
      .collection(collectionName)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();

    const entries = snap.docs.map((d) => {
      const data = d.data() as DocumentData;
      if (type === "competitor") {
        return {
          id: d.id,
          query: data.query || "",
          platformsFound: data.platformsFound || 0,
          totalListings: data.totalListings || 0,
          avgPrice: data.avgPrice || 0,
          createdAt: data.createdAt,
        };
      }
      return { id: d.id, query: data.query || "", source: data.source || "", createdAt: data.createdAt };
    });

    const resultKey = type === "competitor" ? "searches" : "entries";
    return NextResponse.json({ [resultKey]: entries });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch search history", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { query, source, resultCount, type, platformsFound, totalListings, avgPrice } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const collectionName = type === "competitor" ? "competitorSearches" : "searchHistory";

    const entry: Record<string, unknown> = {
      query: query.trim(),
      createdAt: new Date().toISOString(),
    };

    if (type === "competitor") {
      entry.platformsFound = typeof platformsFound === "number" ? platformsFound : 0;
      entry.totalListings = typeof totalListings === "number" ? totalListings : 0;
      entry.avgPrice = typeof avgPrice === "number" ? avgPrice : 0;
    } else {
      entry.source = source || "topbar";
      entry.resultCount = typeof resultCount === "number" ? resultCount : 0;
    }

    await db.collection("users").doc(uid).collection(collectionName).add(entry);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save search", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

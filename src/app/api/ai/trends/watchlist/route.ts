import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody, TrendWatchlistInputSchema, TrendWatchlistUpdateSchema } from "@/lib/validation";
import { addTrendWatchlistEntry, getTrendWatchlist, deleteTrendWatchlistEntry, updateTrendWatchlist } from "@/lib/data/trend-predictor";
import { safeErrorMessage } from "@/lib/api-errors";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const entries = await getTrendWatchlist(uid);
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch watchlist", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(TrendWatchlistInputSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;
    const entryId = await addTrendWatchlistEntry(uid, data);

    if (!entryId) {
      return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
    }

    return NextResponse.json({ id: entryId, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add to watchlist", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const PUT = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(TrendWatchlistUpdateSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { id, ...updates } = validation.data;
    if (!id) {
      return NextResponse.json({ error: "Missing entry ID" }, { status: 400 });
    }

    const success = await updateTrendWatchlist(uid, id, updates);

    if (!success) {
      return NextResponse.json({ error: "Failed to update watchlist entry" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update watchlist entry", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("id");
    if (!entryId) {
      return NextResponse.json({ error: "Missing entry ID" }, { status: 400 });
    }

    const success = await deleteTrendWatchlistEntry(uid, entryId);
    if (!success) {
      return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to remove from watchlist", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

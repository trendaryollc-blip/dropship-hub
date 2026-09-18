import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getListings, deleteListing, getListingStats } from "@/lib/data/product-listings";
import { safeErrorMessage } from "@/lib/api-errors";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform") || undefined;
    const type = searchParams.get("type") || "listings";

    if (type === "stats") {
      const stats = await getListingStats(uid);
      return NextResponse.json({ stats });
    }

    const listings = await getListings(uid, platform);
    return NextResponse.json({ listings });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch listings", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("id");
    if (!listingId) {
      return NextResponse.json({ error: "Missing listing ID" }, { status: 400 });
    }

    const success = await deleteListing(uid, listingId);
    if (!success) {
      return NextResponse.json({ error: "Failed to delete listing" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete listing", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

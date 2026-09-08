import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdCreatives, addAdCreative } from "@/lib/data/ad-creatives";
import { validateBody } from "@/lib/validation";
import { AddAdCreativeInputSchema } from "@/lib/data/schemas";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    let creatives = await getAdCreatives(uid);

    if (campaignId) {
      creatives = creatives.filter((c) => c.campaignId === campaignId);
    }

    return NextResponse.json({ creatives });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch creatives", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(AddAdCreativeInputSchema, body);
    if (!validation.success) return validation.response;

    const creativeId = await addAdCreative(uid, validation.data);
    return NextResponse.json({ success: true, id: creativeId });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save creative", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

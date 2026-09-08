import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { getAdCampaigns, addAdCampaign } from "@/lib/data/ad-campaigns";
import { AddAdCampaignInputSchema } from "@/lib/data/schemas";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let campaigns = await getAdCampaigns(uid);

    if (status && status !== "all") {
      campaigns = campaigns.filter((c) => c.status === status);
    }

    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch campaigns", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(AddAdCampaignInputSchema, body);
    if (!validation.success) return validation.response;

    const campaignId = await addAdCampaign(uid, validation.data);
    return NextResponse.json({ success: true, id: campaignId });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create campaign", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

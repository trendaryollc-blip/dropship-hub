import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdCampaignById, updateAdCampaign, deleteAdCampaign } from "@/lib/data/ad-campaigns";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const id = request.nextUrl.pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: "Missing campaign ID" }, { status: 400 });

    const campaign = await getAdCampaignById(uid, id);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    return NextResponse.json({ campaign });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch campaign", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const id = request.nextUrl.pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: "Missing campaign ID" }, { status: 400 });

    const body = await request.json();
    await updateAdCampaign(uid, id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update campaign", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const id = request.nextUrl.pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: "Missing campaign ID" }, { status: 400 });

    await deleteAdCampaign(uid, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete campaign", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

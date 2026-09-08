import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdCampaigns, updateAdCampaign } from "@/lib/data/ad-campaigns";
import { getAdConnectionByPlatform } from "@/lib/data/ad-connections";
import { getAdapter } from "@/lib/ad-platforms";

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { campaignId, platform } = body as { campaignId?: string; platform?: string };

    if (!campaignId || !platform) {
      return NextResponse.json({ error: "campaignId and platform required" }, { status: 400 });
    }

    if (platform !== "facebook" && platform !== "google") {
      return NextResponse.json({ error: "Invalid platform. Must be facebook or google" }, { status: 400 });
    }

    const connection = await getAdConnectionByPlatform(uid, platform);
    if (!connection) {
      return NextResponse.json({ error: `No active ${platform} connection found` }, { status: 404 });
    }

    const adapter = getAdapter(platform);
    try {
      const metrics = await adapter.getCampaignMetrics(connection.accessToken, connection.accountId, campaignId);
      await updateAdCampaign(uid, campaignId, { metrics });
      return NextResponse.json({ success: true, metrics });
    } catch (apiError) {
      return NextResponse.json(
        { error: "Failed to sync from platform", details: apiError instanceof Error ? apiError.message : "Unknown error" },
        { status: 502 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST_SYNC_ALL = withAuth(async (_request: NextRequest, uid: string) => {
  try {
    const campaigns = await getAdCampaigns(uid, 100);
    const platformCampaigns = campaigns.filter((c) => c.platform !== "manual" && c.platformCampaignId);

    const results: Array<{ campaignId: string; success: boolean; error?: string }> = [];

    for (const campaign of platformCampaigns) {
      try {
        const connection = await getAdConnectionByPlatform(uid, campaign.platform as "facebook" | "google");
        if (!connection) {
          results.push({ campaignId: campaign.id, success: false, error: "No connection" });
          continue;
        }

        const adapter = getAdapter(campaign.platform as "facebook" | "google");
        const metrics = await adapter.getCampaignMetrics(connection.accessToken, connection.accountId, campaign.platformCampaignId!);
        await updateAdCampaign(uid, campaign.id, { metrics });
        results.push({ campaignId: campaign.id, success: true });
      } catch (error) {
        results.push({ campaignId: campaign.id, success: false, error: error instanceof Error ? error.message : "Unknown" });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: "Sync all failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

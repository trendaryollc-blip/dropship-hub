import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdCampaigns } from "@/lib/data/ad-campaigns";
import { getBudgetRecommendations, addBudgetRecommendation } from "@/lib/data/budget-recommendations";
import { generateRecommendations } from "@/lib/ad-platforms/optimizer";

export const GET = withAuth(async (_request: NextRequest, uid: string) => {
  try {
    const recommendations = await getBudgetRecommendations(uid);
    return NextResponse.json({ recommendations });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch recommendations", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (_request: NextRequest, uid: string) => {
  try {
    const campaigns = await getAdCampaigns(uid, 100);
    const activeCampaigns = campaigns.filter((c) => c.status === "active");

    const recommendations = generateRecommendations(activeCampaigns);

    const savedIds: string[] = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    for (const rec of recommendations) {
      const id = await addBudgetRecommendation(uid, {
        ...rec,
        status: "pending",
        expiresAt: expiresAt.toISOString(),
      });
      if (id) savedIds.push(id);
    }

    return NextResponse.json({
      success: true,
      recommendations,
      savedIds,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate recommendations", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

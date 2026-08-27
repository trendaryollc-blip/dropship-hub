import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { DocumentData } from "firebase-admin/firestore";

interface CampaignAnalysis {
  name: string;
  adSpend: number;
  revenue: number;
  profit: number;
  roas: number;
  orders: number;
  costPerOrder: number;
  rating: "excellent" | "good" | "needs-work" | "stop";
  recommendation: string;
  optimizationTips: string[];
}

interface AdAdvisorResult {
  campaigns: CampaignAnalysis[];
  summary: {
    totalAdSpend: number;
    totalRevenue: number;
    overallROAS: number;
    bestCampaign: string;
    worstCampaign: string;
    budgetRecommendation: string;
  };
  insights: string[];
  generatedAt: string;
}

function safeNum(val: unknown, fallback = 0): number {
  return typeof val === "number" ? val : fallback;
}

function safeStr(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

function rateCampaign(roas: number, profit: number): CampaignAnalysis["rating"] {
  if (roas >= 4 && profit > 0) return "excellent";
  if (roas >= 2 && profit > 0) return "good";
  if (roas >= 1) return "needs-work";
  return "stop";
}

function getRecommendation(name: string, roas: number, profit: number, spend: number): string {
  if (roas >= 4) return `${name} is performing exceptionally. Consider scaling budget by 20-30% to maximize returns.`;
  if (roas >= 2) return `${name} is profitable. Test new creatives and audiences to improve ROAS further.`;
  if (roas >= 1) return `${name} is breaking even. Optimize targeting, test new ad copy, or reduce bid amounts.`;
  return `${name} is losing money. Pause and analyze — check targeting, creative fatigue, and landing page conversion.`;
}

function getOptimizationTips(name: string, roas: number): string[] {
  const tips: string[] = [];
  const lower = name.toLowerCase();

  if (roas < 2) {
    tips.push("Narrow your audience — broader isn't always better");
    tips.push("A/B test new ad creatives every 7-14 days");
  }

  if (lower.includes("facebook") || lower.includes("meta")) {
    tips.push("Use Advantage+ Shopping campaigns for e-commerce");
    tips.push("Enable automatic placements to let Meta optimize delivery");
    if (roas < 2) tips.push("Check Audience overlap — too many similar audiences dilute results");
  }

  if (lower.includes("google")) {
    tips.push("Add negative keywords to exclude irrelevant searches");
    tips.push("Use Performance Max campaigns for broader reach");
    if (roas < 2) tips.push("Review search terms report and add poor performers as negatives");
  }

  if (lower.includes("tiktok")) {
    tips.push("Use UGC-style content — it outperforms polished ads on TikTok");
    tips.push("Hook viewers in the first 1-2 seconds");
    if (roas < 2) tips.push("Test Spark Ads (boosting organic posts) vs In-Feed ads");
  }

  if (lower.includes("instagram")) {
    tips.push("Leverage Reels for 2x higher engagement");
    tips.push("Use carousel ads to showcase multiple product angles");
  }

  if (tips.length === 0) {
    tips.push("Review audience targeting — ensure alignment with product");
    tips.push("Test different ad formats (video, carousel, collection)");
    if (roas < 2) tips.push("Check landing page speed and mobile experience");
  }

  return tips.slice(0, 3);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    // Fetch profit entries with campaign data
    const profitSnap = await userRef
      .collection("profitEntries")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const profitEntries = profitSnap.docs.map((d) => d.data() as DocumentData);

    if (profitEntries.length === 0) {
      return NextResponse.json({
        campaigns: [],
        summary: {
          totalAdSpend: 0,
          totalRevenue: 0,
          overallROAS: 0,
          bestCampaign: "N/A",
          worstCampaign: "N/A",
          budgetRecommendation: "Start tracking your ad campaigns to get AI-powered optimization advice.",
        },
        insights: ["No profit data found. Start logging your orders with campaign names to get ad optimization insights."],
        generatedAt: new Date().toISOString(),
      });
    }

    // Group by campaign
    const campaignMap = new Map<string, { adSpend: number; revenue: number; profit: number; orders: number }>();
    for (const entry of profitEntries) {
      const name = safeStr(entry.campaignName, "Organic");
      const existing = campaignMap.get(name) || { adSpend: 0, revenue: 0, profit: 0, orders: 0 };
      existing.adSpend += safeNum(entry.adSpend);
      existing.revenue += safeNum(entry.revenue);
      existing.profit += safeNum(entry.netProfit);
      existing.orders += 1;
      campaignMap.set(name, existing);
    }

    // Analyze each campaign
    const campaigns: CampaignAnalysis[] = [];
    for (const [name, data] of campaignMap) {
      if (data.adSpend === 0 && name === "Organic") continue; // Skip organic for ad analysis

      const roas = data.adSpend > 0 ? +(data.revenue / data.adSpend).toFixed(2) : 0;
      const costPerOrder = data.orders > 0 ? +(data.adSpend / data.orders).toFixed(2) : 0;

      campaigns.push({
        name,
        adSpend: +data.adSpend.toFixed(2),
        revenue: +data.revenue.toFixed(2),
        profit: +data.profit.toFixed(2),
        roas,
        orders: data.orders,
        costPerOrder,
        rating: rateCampaign(roas, data.profit),
        recommendation: getRecommendation(name, roas, data.profit, data.adSpend),
        optimizationTips: getOptimizationTips(name, roas),
      });
    }

    campaigns.sort((a, b) => b.roas - a.roas);

    const totalAdSpend = campaigns.reduce((s, c) => s + c.adSpend, 0);
    const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
    const overallROAS = totalAdSpend > 0 ? +(totalRevenue / totalAdSpend).toFixed(2) : 0;

    const bestCampaign = campaigns[0]?.name || "N/A";
    const worstCampaign = campaigns[campaigns.length - 1]?.name || "N/A";

    let budgetRecommendation = "";
    if (overallROAS >= 4) {
      budgetRecommendation = "Excellent performance! Consider scaling your best campaigns by 25-50%.";
    } else if (overallROAS >= 2) {
      budgetRecommendation = "Profitable. Focus on optimizing underperformers before scaling.";
    } else if (overallROAS >= 1) {
      budgetRecommendation = "Breaking even. Optimize targeting and creatives before increasing spend.";
    } else {
      budgetRecommendation = "Losing money on ads. Pause underperformers and focus on organic growth while optimizing.";
    }

    const insights: string[] = [];
    if (overallROAS >= 3) insights.push(`Your overall ROAS of ${overallROAS}x is excellent — you're making $${overallROAS} for every $1 spent`);
    else if (overallROAS >= 2) insights.push(`ROAS of ${overallROAS}x is profitable — room to scale with optimization`);
    else if (overallROAS > 0) insights.push(`ROAS of ${overallROAS}x needs improvement — focus on targeting and creatives`);

    const excellentCount = campaigns.filter((c) => c.rating === "excellent").length;
    const stopCount = campaigns.filter((c) => c.rating === "stop").length;

    if (excellentCount > 0) insights.push(`${excellentCount} campaign${excellentCount > 1 ? "s" : ""} performing excellently — scale these`);
    if (stopCount > 0) insights.push(`${stopCount} campaign${stopCount > 1 ? "s" : ""} losing money — pause and restructure`);

    const totalProfit = campaigns.reduce((s, c) => s + c.profit, 0);
    if (totalProfit > 0) insights.push(`Net profit from ads: $${totalProfit.toFixed(2)} — reinvest a portion into winning campaigns`);

    const result: AdAdvisorResult = {
      campaigns,
      summary: {
        totalAdSpend: +totalAdSpend.toFixed(2),
        totalRevenue: +totalRevenue.toFixed(2),
        overallROAS,
        bestCampaign,
        worstCampaign,
        budgetRecommendation,
      },
      insights,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to analyze ad campaigns", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

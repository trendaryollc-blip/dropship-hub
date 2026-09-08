import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody, TrendAnalysisInputSchema } from "@/lib/validation";
import { predictTrend, detectRisingStars, generateMockSignals } from "@/lib/trend-analyzer";
import { addTrendPrediction } from "@/lib/data/trend-predictor";

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(TrendAnalysisInputSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { keyword, category } = validation.data;
    const cat = category || "general";

    const startTime = Date.now();
    const signals = generateMockSignals(keyword, cat);
    const prediction = predictTrend(signals);
    const risingStars = detectRisingStars(signals);

    await addTrendPrediction(uid, {
      productIdea: prediction.productIdea,
      category: prediction.category,
      trendScore: prediction.trendScore,
      confidence: prediction.confidence,
      direction: prediction.direction,
      predictedPeak: prediction.predictedPeak,
      timeToPeak: prediction.timeToPeak,
      saturationRisk: prediction.saturationRisk,
      competitionLevel: prediction.competitionLevel,
      reasoning: prediction.reasoning,
      relatedKeywords: prediction.relatedKeywords,
      suggestedPlatforms: prediction.suggestedPlatforms,
      estimatedMargin: prediction.estimatedMargin,
    });

    return NextResponse.json({
      signals,
      prediction,
      risingStars,
      relatedTrends: signals.slice(0, 5).map((s) => ({
        keyword: s.keyword,
        growth: s.growthRate,
        platform: s.platform,
      })),
      analysisTime: Date.now() - startTime,
      provider: "trend-analyzer",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to analyze trend", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const trendingKeywords = [
      "wireless earbuds", "smart home devices", "pet accessories",
      "posture corrector", "led strip lights", "portable charger",
      "yoga mat", "resistance bands", "phone accessories", "travel organizer",
    ];

    const signals = trendingKeywords.slice(0, 5).flatMap((kw) =>
      generateMockSignals(kw, "general").slice(0, 1)
    );

    const risingStars = detectRisingStars(signals);

    return NextResponse.json({
      trending: trendingKeywords.slice(0, 10).map((kw, i) => ({
        id: `trend-${i}`,
        keyword: kw,
        growth: Math.round(Math.random() * 200 - 50),
        volume: Math.floor(Math.random() * 50000) + 5000,
        category: "general",
      })),
      risingStars,
      alerts: [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch trends", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

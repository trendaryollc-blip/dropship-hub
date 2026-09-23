import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody, TrendAnalysisInputSchema } from "@/lib/validation";
import { analyzeKeyword, getTrendingKeywords } from "@/lib/data-sources/aggregator";
import { addTrendPrediction } from "@/lib/data/trend-predictor";
import type { TrendPlatform } from "@/types/trend-predictor";
import { safeErrorMessage } from "@/lib/api-errors";

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(TrendAnalysisInputSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { keyword, category, platforms, timeframe } = validation.data;
    const cat = category || "general";

    const result = await analyzeKeyword(
      keyword,
      cat,
      platforms as TrendPlatform[] | undefined,
      timeframe
    );

    await addTrendPrediction(uid, {
      productIdea: result.prediction.productIdea,
      category: result.prediction.category,
      trendScore: result.prediction.trendScore,
      confidence: result.prediction.confidence,
      direction: result.prediction.direction,
      predictedPeak: result.prediction.predictedPeak,
      timeToPeak: result.prediction.timeToPeak,
      saturationRisk: result.prediction.saturationRisk,
      competitionLevel: result.prediction.competitionLevel,
      reasoning: result.prediction.reasoning,
      relatedKeywords: result.prediction.relatedKeywords,
      suggestedPlatforms: result.prediction.suggestedPlatforms,
      estimatedMargin: result.prediction.estimatedMargin,
    });

    return NextResponse.json({
      signals: result.signals,
      prediction: result.prediction,
      risingStars: result.risingStars,
      relatedTrends: result.relatedTrends,
      analysisTime: result.analysisTime,
      provider: result.provider,
      geoData: result.geoData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to analyze trend", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

export const GET = withAuth(async (request: NextRequest, _uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword");

    if (keyword) {
      const { fetchRealSignals } = await import("@/lib/data-sources/aggregator");
      const signals = await fetchRealSignals(keyword, "general");
      const { detectRisingStars } = await import("@/lib/trend-analyzer");
      const risingStars = detectRisingStars(signals);

      return NextResponse.json({
        trending: [],
        risingStars,
        alerts: [],
      });
    }

    const trendingKeywords = await getTrendingKeywords();
    return NextResponse.json({
      trending: trendingKeywords.map((t, i) => ({
        id: `trend-${i}`,
        keyword: t.keyword,
        growth: t.growth,
        volume: t.volume,
        direction: t.direction,
        category: "general",
      })),
      risingStars: [],
      alerts: [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch trends", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

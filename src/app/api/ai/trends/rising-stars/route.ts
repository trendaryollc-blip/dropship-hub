import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { fetchRealSignals } from "@/lib/data-sources/aggregator";
import { detectRisingStars } from "@/lib/trend-analyzer";
import type { TrendSignal } from "@/types/trend-predictor";
import { safeErrorMessage } from "@/lib/api-errors";

export const GET = withAuth(async (_request: NextRequest, _uid: string) => {
  try {
    const trendingKeywords = [
      "wireless earbuds", "smart home devices", "pet accessories",
      "posture corrector", "led strip lights", "portable charger",
      "yoga mat", "resistance bands", "phone accessories", "travel organizer",
      "sunscreen sticks", "car phone mount", "desk organizer",
      "reusable water bottle", "bamboo products",
    ];

    const allSignals = await Promise.allSettled(
      trendingKeywords.map(async (kw) => {
        const signals = await fetchRealSignals(kw, "general", ["google_trends", "tiktok"], "7d");
        return signals[0] || null;
      })
    );

    const validSignals: TrendSignal[] = [];
    for (const result of allSignals) {
      if (result.status === "fulfilled" && result.value !== null) {
        validSignals.push(result.value);
      }
    }

    const risingStars = detectRisingStars(validSignals);

    return NextResponse.json({ risingStars });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch rising stars", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { generateMockSignals, detectRisingStars } from "@/lib/trend-analyzer";

export const GET = withAuth(async (_request: NextRequest, _uid: string) => {
  try {
    const trendingKeywords = [
      "wireless earbuds", "smart home devices", "pet accessories",
      "posture corrector", "led strip lights", "portable charger",
      "yoga mat", "resistance bands", "phone accessories", "travel organizer",
      "sunscreen sticks", "car phone mount", "desk organizer",
      "reusable water bottle", "bamboo products",
    ];

    const allSignals = trendingKeywords.flatMap((kw) =>
      generateMockSignals(kw, "general").slice(0, 1)
    );

    const risingStars = detectRisingStars(allSignals);

    return NextResponse.json({ risingStars });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch rising stars", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

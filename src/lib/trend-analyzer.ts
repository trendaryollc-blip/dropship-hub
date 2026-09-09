import type { TrendSignal, TrendPrediction, RisingStar, TrendDirection, PredictionConfidence, TrendPlatform } from "@/types/trend-predictor";

export interface TrendScore {
  velocity: number;
  acceleration: number;
  saturation: number;
  overallScore: number;
}

export function calculateTrendScore(signal: TrendSignal): TrendScore {
  const volumeGrowth = signal.previousVolume > 0
    ? ((signal.volume - signal.previousVolume) / signal.previousVolume) * 100
    : 0;

  const velocity = Math.min(100, Math.max(0, volumeGrowth));
  const acceleration = Math.min(100, Math.max(0, signal.acceleration * 10));
  const saturation = Math.min(100, Math.max(0, signal.saturationLevel));

  const overallScore = Math.round(
    (velocity * 0.4) +
    (acceleration * 0.3) +
    ((100 - saturation) * 0.3)
  );

  return {
    velocity: Math.round(velocity * 10) / 10,
    acceleration: Math.round(acceleration * 10) / 10,
    saturation: Math.round(saturation * 10) / 10,
    overallScore: Math.min(100, Math.max(0, overallScore)),
  };
}

export function predictTrend(
  signals: TrendSignal[],
  _historicalData?: { date: string; volume: number }[]
): TrendPrediction {
  const primarySignal = signals[0];
  const trendScore = calculateTrendScore(primarySignal);

  let direction: TrendDirection;
  if (trendScore.velocity > 50 && trendScore.acceleration > 30) {
    direction = "rising";
  } else if (trendScore.velocity > 20 && trendScore.saturation < 50) {
    direction = "stable";
  } else if (trendScore.saturation > 70) {
    direction = "peaking";
  } else if (trendScore.velocity < 0) {
    direction = "declining";
  } else {
    direction = "stable";
  }

  let confidence: PredictionConfidence;
  if (signals.length >= 3 && trendScore.overallScore > 60) {
    confidence = "high";
  } else if (signals.length >= 2 || trendScore.overallScore > 40) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  const daysToPeak = direction === "rising"
    ? Math.round(30 + (100 - trendScore.overallScore) * 0.5)
    : direction === "peaking"
    ? Math.round(7 + (100 - trendScore.saturation) * 0.3)
    : Math.round(60 + Math.random() * 30);

  const peakDate = new Date();
  peakDate.setDate(peakDate.getDate() + daysToPeak);

  const saturationRisk = Math.round(
    trendScore.saturation * 0.6 +
    (trendScore.velocity > 80 ? 20 : 0) +
    (signals.length > 2 ? 10 : 0)
  );

  const competitionLevel: TrendPrediction["competitionLevel"] =
    saturationRisk > 70 ? "very_high" :
    saturationRisk > 50 ? "high" :
    saturationRisk > 30 ? "medium" : "low";

  const allKeywords = signals.flatMap((s) => s.keyword.split(" "));
  const uniqueKeywords = [...new Set(allKeywords)].slice(0, 8);

  return {
    id: `pred-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productIdea: primarySignal.keyword,
    category: primarySignal.category,
    trendScore: trendScore.overallScore,
    confidence,
    direction,
    predictedPeak: peakDate.toISOString().split("T")[0],
    timeToPeak: `${daysToPeak} days`,
    saturationRisk,
    competitionLevel,
    reasoning: generateReasoning(direction, trendScore, signals.length, saturationRisk),
    signals,
    relatedKeywords: uniqueKeywords,
    suggestedPlatforms: determinePlatforms(signals),
    estimatedMargin: estimateMargin(trendScore.overallScore, saturationRisk),
    createdAt: new Date().toISOString(),
  };
}

function generateReasoning(direction: TrendDirection, score: TrendScore, signalCount: number, saturationRisk: number): string {
  const parts: string[] = [];

  if (direction === "rising") {
    parts.push(`Strong upward trend with ${score.velocity.toFixed(0)}% velocity`);
    if (score.acceleration > 30) parts.push("acceleration increasing");
    parts.push(`${signalCount} signal sources confirm the trend`);
  } else if (direction === "peaking") {
    parts.push(`Trend approaching peak with ${saturationRisk}% saturation risk`);
    parts.push("Consider acting quickly before market saturation");
  } else if (direction === "declining") {
    parts.push("Trend is declining — exercise caution");
    parts.push("May still have opportunity in underserved niches");
  } else {
    parts.push("Stable trend with moderate growth");
    parts.push("Low risk, steady demand expected");
  }

  if (saturationRisk > 60) parts.push("High competition expected");
  else if (saturationRisk < 30) parts.push("Low competition — good entry opportunity");

  return parts.join(". ") + ".";
}

function determinePlatforms(signals: TrendSignal[]): string[] {
  const platformSet = new Set(signals.map((s) => s.platform));
  const platforms = Array.from(platformSet);

  if (platforms.includes("tiktok") || platforms.includes("instagram")) {
    return ["tiktok", "instagram", "shopify"];
  }
  if (platforms.includes("google_trends") || platforms.includes("amazon_movers")) {
    return ["amazon", "shopify", "google_shopping"];
  }
  return ["shopify", "amazon"];
}

function estimateMargin(trendScore: number, saturationRisk: number): number {
  const base = 30;
  const trendBonus = trendScore * 0.3;
  const saturationPenalty = saturationRisk * 0.2;
  return Math.round(Math.max(10, Math.min(70, base + trendBonus - saturationPenalty)));
}

export function detectRisingStars(signals: TrendSignal[]): RisingStar[] {
  const risingStars: RisingStar[] = [];

  for (const signal of signals) {
    const score = calculateTrendScore(signal);

    if (score.velocity > 30 && score.acceleration > 20 && score.saturation < 50) {
      const competitionScore = Math.round(score.saturation * 0.8);
      const opportunityScore = Math.round(
        (score.velocity * 0.4) +
        (score.acceleration * 0.3) +
        ((100 - competitionScore) * 0.3)
      );

      let status: RisingStar["status"];
      if (score.velocity > 80 && score.saturation < 20) status = "emerging";
      else if (score.velocity > 50) status = "rising";
      else if (score.velocity > 30 && score.saturation < 40) status = "hot";
      else if (score.saturation > 60) status = "peaking";
      else status = "saturated";

      risingStars.push({
        id: `rs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        productKeyword: signal.keyword,
        category: signal.category,
        growthVelocity: score.velocity,
        competitionScore,
        opportunityScore,
        currentVolume: signal.volume,
        platforms: [signal.platform],
        firstSeen: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdated: new Date().toISOString(),
        status,
        reasoning: generateRisingStarReasoning(score, status),
      });
    }
  }

  risingStars.sort((a, b) => b.opportunityScore - a.opportunityScore);
  return risingStars.slice(0, 10);
}

function generateRisingStarReasoning(score: TrendScore, status: RisingStar["status"]): string {
  if (status === "emerging") return `Very early stage with ${score.velocity.toFixed(0)}% growth velocity. Low competition — first-mover advantage.`;
  if (status === "rising") return `Growing steadily at ${score.velocity.toFixed(0)}%. Good timing to enter before peak.`;
  if (status === "hot") return `High demand with ${score.velocity.toFixed(0)}% velocity. Act fast but expect competition.`;
  if (status === "peaking") return `Approaching peak. High saturation risk — consider niche differentiation.`;
  return `Market saturated. Look for sub-niches or differentiators.`;
}

export function aggregateSignalsByKeyword(signals: TrendSignal[]): Map<string, TrendSignal[]> {
  const map = new Map<string, TrendSignal[]>();
  for (const signal of signals) {
    const existing = map.get(signal.keyword) || [];
    existing.push(signal);
    map.set(signal.keyword, existing);
  }
  return map;
}

export function calculateMarketSaturation(signals: TrendSignal[]): number {
  if (signals.length === 0) return 0;
  const avgSaturation = signals.reduce((sum, s) => sum + s.saturationLevel, 0) / signals.length;
  return Math.round(avgSaturation);
}

export function determineTrendDirection(growthRate: number, acceleration: number): TrendDirection {
  if (growthRate > 20 && acceleration > 0) return "rising";
  if (growthRate > 0 && acceleration < 0) return "peaking";
  if (growthRate < -10) return "declining";
  return "stable";
}

export function generateMockSignals(keyword: string, category: string): TrendSignal[] {
  const platforms: TrendPlatform[] = ["tiktok", "instagram", "google_trends", "amazon_movers"];
  return platforms.map((platform, i) => ({
    id: `sig-${Date.now()}-${i}`,
    platform,
    keyword,
    category,
    volume: Math.floor(Math.random() * 50000) + 5000,
    previousVolume: Math.floor(Math.random() * 30000) + 2000,
    growthRate: Math.round((Math.random() * 200 - 50) * 10) / 10,
    direction: ["rising", "stable", "peaking", "declining"][Math.floor(Math.random() * 4)] as TrendDirection,
    velocity: Math.round(Math.random() * 100 * 10) / 10,
    acceleration: Math.round((Math.random() * 50 - 25) * 10) / 10,
    saturationLevel: Math.round(Math.random() * 100),
    fetchedAt: new Date().toISOString(),
  }));
}

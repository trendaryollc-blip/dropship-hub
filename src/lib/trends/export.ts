import type { TrendPrediction, RisingStar, TrendWatchlistEntry } from "@/types/trend-predictor";

function escapeCSV(value: string | number | boolean | undefined): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPredictionsToCSV(predictions: TrendPrediction[]): void {
  const headers = [
    "Keyword", "Category", "Trend Score", "Direction", "Confidence",
    "Predicted Peak", "Time to Peak", "Saturation Risk", "Competition Level",
    "Estimated Margin", "Related Keywords", "Suggested Platforms", "Created At",
  ];

  const rows = predictions.map((p) => [
    escapeCSV(p.productIdea),
    escapeCSV(p.category),
    p.trendScore,
    escapeCSV(p.direction),
    escapeCSV(p.confidence),
    escapeCSV(p.predictedPeak),
    escapeCSV(p.timeToPeak),
    p.saturationRisk,
    escapeCSV(p.competitionLevel),
    p.estimatedMargin,
    escapeCSV(p.relatedKeywords?.join("; ")),
    escapeCSV(p.suggestedPlatforms?.join("; ")),
    escapeCSV(p.createdAt),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const date = new Date().toISOString().split("T")[0];
  downloadCSV(csv, `trend-predictions-${date}.csv`);
}

export function exportWatchlistToCSV(watchlist: TrendWatchlistEntry[]): void {
  const headers = ["Keyword", "Category", "Alert on Rising", "Alert on Peak", "Alert on Saturation", "Added At"];

  const rows = watchlist.map((w) => [
    escapeCSV(w.keyword),
    escapeCSV(w.category),
    w.alertOnRising,
    w.alertOnPeak,
    w.alertOnSaturation,
    escapeCSV(w.addedAt),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const date = new Date().toISOString().split("T")[0];
  downloadCSV(csv, `trend-watchlist-${date}.csv`);
}

export function exportAnalysisToCSV(
  keyword: string,
  signals: { platform: string; volume: number; growthRate: number; velocity: number; acceleration: number; saturationLevel: number }[],
  prediction: TrendPrediction
): void {
  const headers = ["Platform", "Volume", "Growth Rate", "Velocity", "Acceleration", "Saturation Level"];
  const signalRows = signals.map((s) => [
    escapeCSV(s.platform),
    s.volume,
    s.growthRate,
    s.velocity,
    s.acceleration,
    s.saturationLevel,
  ]);

  const summaryHeaders = ["Metric", "Value"];
  const summaryRows = [
    ["Trend Score", prediction.trendScore],
    ["Direction", prediction.direction],
    ["Confidence", prediction.confidence],
    ["Time to Peak", prediction.timeToPeak],
    ["Estimated Margin", `${prediction.estimatedMargin}%`],
    ["Saturation Risk", `${prediction.saturationRisk}%`],
    ["Competition Level", prediction.competitionLevel],
  ];

  const csv = [
    `Analysis: ${keyword}`,
    "",
    headers.join(","),
    ...signalRows.map((r) => r.join(",")),
    "",
    summaryHeaders.join(","),
    ...summaryRows.map((r) => r.join(",")),
  ].join("\n");

  const date = new Date().toISOString().split("T")[0];
  downloadCSV(csv, `trend-analysis-${keyword.replace(/\s+/g, "-")}-${date}.csv`);
}

export function exportRisingStarsToCSV(stars: RisingStar[]): void {
  const headers = [
    "Keyword", "Category", "Status", "Growth Velocity", "Competition Score",
    "Opportunity Score", "Current Volume", "Platforms", "First Seen", "Last Updated",
  ];

  const rows = stars.map((s) => [
    escapeCSV(s.productKeyword),
    escapeCSV(s.category),
    escapeCSV(s.status),
    s.growthVelocity,
    s.competitionScore,
    s.opportunityScore,
    s.currentVolume,
    escapeCSV(s.platforms?.join("; ")),
    escapeCSV(s.firstSeen),
    escapeCSV(s.lastUpdated),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const date = new Date().toISOString().split("T")[0];
  downloadCSV(csv, `rising-stars-${date}.csv`);
}

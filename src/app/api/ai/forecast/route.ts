import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";
import { safeNum, safeStr } from "@/lib/utils-helpers";

interface ForecastPoint {
  date: string;
  actual: number | null;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

interface RevenueForecast {
  forecast: ForecastPoint[];
  summary: {
    currentTrend: "growing" | "declining" | "stable";
    projectedWeeklyRevenue: number;
    projectedMonthlyRevenue: number;
    confidenceLevel: "high" | "medium" | "low";
    avgDailyRevenue: number;
    bestDay: string;
    worstDay: string;
    growthRate: number;
  };
  insights: string[];
  generatedAt: string;
}

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const p of points) {
    const predicted = intercept + slope * p.x;
    ssRes += (p.y - predicted) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2: Math.max(0, r2) };
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { days = 14 } = body;

    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    // Fetch revenue data for last 60 days
    const revenueSnap = await userRef
      .collection("revenue")
      .orderBy("createdAt", "desc")
      .limit(60)
      .get();

    const profitSnap = await userRef
      .collection("profitEntries")
      .orderBy("createdAt", "desc")
      .limit(60)
      .get();

    const revenueEntries = revenueSnap.docs.map((d) => d.data() as DocumentData);
    const profitEntries = profitSnap.docs.map((d) => d.data() as DocumentData);

    // Build daily revenue map
    const dailyRevenue = new Map<string, number>();
    const dailyProfit = new Map<string, number>();
    const dailyOrders = new Map<string, number>();

    for (const entry of revenueEntries) {
      const date = safeStr(entry.date);
      if (!date) continue;
      dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + safeNum(entry.amount));
      dailyOrders.set(date, (dailyOrders.get(date) || 0) + safeNum(entry.orders));
    }

    for (const entry of profitEntries) {
      const date = safeStr(entry.date);
      if (!date) continue;
      dailyProfit.set(date, (dailyProfit.get(date) || 0) + safeNum(entry.netProfit));
    }

    // Sort dates and build time series
    const allDates = [...new Set([...dailyRevenue.keys()])].sort();
    const last30Dates = allDates.slice(-30);

    if (last30Dates.length < 3) {
      // Not enough data — return basic forecast
      return NextResponse.json({
        forecast: [],
        summary: {
          currentTrend: "stable",
          projectedWeeklyRevenue: 0,
          projectedMonthlyRevenue: 0,
          confidenceLevel: "low",
          avgDailyRevenue: 0,
          bestDay: "N/A",
          worstDay: "N/A",
          growthRate: 0,
        },
        insights: ["Not enough revenue data to generate a forecast. Start tracking your sales to get AI-powered predictions."],
        generatedAt: new Date().toISOString(),
      });
    }

    // Build regression points (day index -> revenue)
    const regressionPoints = last30Dates.map((date, i) => ({
      x: i,
      y: dailyRevenue.get(date) || 0,
    }));

    const { slope, intercept, r2 } = linearRegression(regressionPoints);

    // Generate forecast
    const today = new Date();
    const forecast: ForecastPoint[] = [];

    // Add historical data
    for (const date of last30Dates) {
      forecast.push({
        date,
        actual: dailyRevenue.get(date) || 0,
        predicted: 0,
        lowerBound: 0,
        upperBound: 0,
      });
    }

    // Add future predictions
    const avgDaily = regressionPoints.reduce((s, p) => s + p.y, 0) / regressionPoints.length;
    const stdDev = Math.sqrt(regressionPoints.reduce((s, p) => s + (p.y - avgDaily) ** 2, 0) / regressionPoints.length);

    for (let i = 1; i <= days; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + i);
      const dateStr = futureDate.toISOString().split("T")[0];
      const dayIndex = last30Dates.length + i - 1;
      const predicted = Math.max(0, intercept + slope * dayIndex);
      const uncertainty = stdDev * Math.sqrt(1 + i / last30Dates.length);

      forecast.push({
        date: dateStr,
        actual: null,
        predicted: Math.round(predicted * 100) / 100,
        lowerBound: Math.round(Math.max(0, predicted - uncertainty * 1.96) * 100) / 100,
        upperBound: Math.round((predicted + uncertainty * 1.96) * 100) / 100,
      });
    }

    // Summary stats
    const recent7 = regressionPoints.slice(-7);
    const previous7 = regressionPoints.slice(-14, -7);
    const recentAvg = recent7.reduce((s, p) => s + p.y, 0) / recent7.length;
    const previousAvg = previous7.length > 0 ? previous7.reduce((s, p) => s + p.y, 0) / previous7.length : recentAvg;
    const growthRate = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    let currentTrend: "growing" | "declining" | "stable" = "stable";
    if (growthRate > 5) currentTrend = "growing";
    else if (growthRate < -5) currentTrend = "declining";

    // Find best/worst days
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayTotals = new Map<number, { total: number; count: number }>();
    for (const point of regressionPoints) {
      const dateIdx = last30Dates[regressionPoints.indexOf(point)];
      if (dateIdx) {
        const dayOfWeek = new Date(dateIdx).getDay();
        const existing = dayTotals.get(dayOfWeek) || { total: 0, count: 0 };
        existing.total += point.y;
        existing.count += 1;
        dayTotals.set(dayOfWeek, existing);
      }
    }

    let bestDay = "N/A", worstDay = "N/A";
    let bestAvg = -1, worstAvg = Infinity;
    for (const [day, data] of dayTotals) {
      const avg = data.total / data.count;
      if (avg > bestAvg) { bestAvg = avg; bestDay = dayNames[day]; }
      if (avg < worstAvg) { worstAvg = avg; worstDay = dayNames[day]; }
    }

    // Insights
    const insights: string[] = [];
    if (currentTrend === "growing") {
      insights.push(`Revenue is trending upward at ${growthRate.toFixed(1)}% — keep doing what's working`);
    } else if (currentTrend === "declining") {
      insights.push(`Revenue has declined ${Math.abs(growthRate).toFixed(1)}% recently — investigate causes and adjust strategy`);
    } else {
      insights.push("Revenue is relatively stable — look for opportunities to accelerate growth");
    }

    if (bestDay !== "N/A") {
      insights.push(`${bestDay} is your strongest day — consider running promotions then`);
    }

    if (r2 > 0.7) {
      insights.push("Your revenue pattern is highly predictable — forecasts should be reliable");
    } else if (r2 > 0.4) {
      insights.push("Moderate prediction confidence — external factors may be influencing revenue");
    } else {
      insights.push("Revenue is volatile — focus on consistent marketing and operations");
    }

    const projectedWeekly = forecast.slice(-7).reduce((s, f) => s + f.predicted, 0);
    const projectedMonthly = forecast.reduce((s, f) => s + f.predicted, 0);

    if (projectedWeekly > avgDaily * 7 * 1.1) {
      insights.push("Projected to outperform recent average — good momentum");
    }

    const result: RevenueForecast = {
      forecast,
      summary: {
        currentTrend,
        projectedWeeklyRevenue: Math.round(projectedWeekly * 100) / 100,
        projectedMonthlyRevenue: Math.round(projectedMonthly * 100) / 100,
        confidenceLevel: r2 > 0.7 ? "high" : r2 > 0.4 ? "medium" : "low",
        avgDailyRevenue: Math.round(avgDaily * 100) / 100,
        bestDay,
        worstDay,
        growthRate: Math.round(growthRate * 10) / 10,
      },
      insights,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate forecast", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { sendTrendDigest, sendAlertEmail, sendWeeklyReport } from "@/lib/trends/email";
import { getTrendPredictions, getTrendAlerts } from "@/lib/data/trend-predictor";
import { getNotifications } from "@/lib/trends/notifications";
import type { TrendPrediction, TrendAlert, PredictionConfidence, TrendDirection } from "@/types/trend-predictor";
import { safeErrorMessage } from "@/lib/api-errors";

function castPrediction(p: {
  id: string;
  productIdea: string;
  category: string;
  trendScore: number;
  confidence: string;
  direction: string;
  predictedPeak: string;
  timeToPeak: string;
  saturationRisk: number;
  competitionLevel: string;
  reasoning: string;
  relatedKeywords?: string[];
  suggestedPlatforms?: string[];
  estimatedMargin: number;
  createdAt: unknown;
}): TrendPrediction {
  const VALID_CONFIDENCE: PredictionConfidence[] = ["high", "medium", "low"];
  const VALID_DIRECTION: TrendDirection[] = ["rising", "peaking", "stable", "declining"];
  const VALID_COMPETITION: TrendPrediction["competitionLevel"][] = ["low", "medium", "high", "very_high"];

  return {
    ...p,
    confidence: VALID_CONFIDENCE.includes(p.confidence as PredictionConfidence) ? (p.confidence as PredictionConfidence) : "low",
    direction: VALID_DIRECTION.includes(p.direction as TrendDirection) ? (p.direction as TrendDirection) : "stable",
    competitionLevel: VALID_COMPETITION.includes(p.competitionLevel as TrendPrediction["competitionLevel"]) ? (p.competitionLevel as TrendPrediction["competitionLevel"]) : "medium",
    signals: [],
    relatedKeywords: p.relatedKeywords || [],
    suggestedPlatforms: p.suggestedPlatforms || [],
    createdAt: typeof p.createdAt === "string"
      ? p.createdAt
      : p.createdAt && typeof p.createdAt === "object" && "toDate" in p.createdAt
        ? (p.createdAt as { toDate: () => Date }).toDate().toISOString()
        : new Date().toISOString(),
  };
}

function castAlert(a: {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  keyword?: string;
  category?: string;
  read: boolean;
  createdAt: unknown;
}): TrendAlert {
  const VALID_ALERT_TYPE: TrendAlert["type"][] = ["rising_star", "peak_warning", "saturation_alert", "new_trend", "volume_spike"];
  const VALID_SEVERITY: TrendAlert["severity"][] = ["info", "warning", "critical"];

  return {
    ...a,
    type: VALID_ALERT_TYPE.includes(a.type as TrendAlert["type"]) ? (a.type as TrendAlert["type"]) : "new_trend",
    severity: VALID_SEVERITY.includes(a.severity as TrendAlert["severity"]) ? (a.severity as TrendAlert["severity"]) : "info",
    createdAt: typeof a.createdAt === "string"
      ? a.createdAt
      : a.createdAt && typeof a.createdAt === "object" && "toDate" in a.createdAt
        ? (a.createdAt as { toDate: () => Date }).toDate().toISOString()
        : new Date().toISOString(),
  };
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { action, email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (action === "daily-digest") {
      const [predictions, alerts] = await Promise.all([
        getTrendPredictions(uid, 10),
        getTrendAlerts(uid, false),
      ]);

      const result = await sendTrendDigest(email, {
        predictions: predictions.map(castPrediction),
        risingStars: [],
        alerts: alerts.map(castAlert),
      });

      return NextResponse.json(result);
    }

    if (action === "alert") {
      const { alert } = body;
      const result = await sendAlertEmail(email, alert);
      return NextResponse.json(result);
    }

    if (action === "weekly-report") {
      const [predictions, alerts] = await Promise.all([
        getTrendPredictions(uid, 50),
        getTrendAlerts(uid, false),
      ]);

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);

      const result = await sendWeeklyReport(email, {
        predictions: predictions.map(castPrediction),
        risingStars: [],
        alerts: alerts.map(castAlert),
        accuracyStats: undefined,
        weekStart: weekStart.toLocaleDateString(),
        weekEnd: now.toLocaleDateString(),
        topPerformers: [],
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send email", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

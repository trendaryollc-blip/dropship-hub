import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

const SEASONAL_EVENTS = [
  { season: "q4", eventName: "Q4 Holiday Season", startDate: "2025-10-01", endDate: "2025-12-31" },
  { season: "back_to_school", eventName: "Back to School", startDate: "2025-07-15", endDate: "2025-09-15" },
  { season: "summer", eventName: "Summer Peak", startDate: "2025-05-01", endDate: "2025-08-31" },
  { season: "valentines", eventName: "Valentine's Day", startDate: "2025-01-15", endDate: "2025-02-14" },
  { season: "mothers_day", eventName: "Mother's Day", startDate: "2025-04-15", endDate: "2025-05-11" },
];

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

function getTier(reliability: number, capacity: number): "elite" | "reliable" | "risky" | "avoid" {
  if (reliability >= 85 && capacity >= 80) return "elite";
  if (reliability >= 70 && capacity >= 60) return "reliable";
  if (reliability >= 50) return "risky";
  return "avoid";
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season");

    const perfSnap = await db
      .collection("users")
      .doc(uid)
      .collection("supplierPerformance")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const supplierMap = new Map<string, any>();
    for (const doc of perfSnap.docs) {
      const data = doc.data();
      if (!supplierMap.has(data.supplierId)) {
        supplierMap.set(data.supplierId, data);
      }
    }

    const events = season
      ? SEASONAL_EVENTS.filter((e) => e.season === season)
      : SEASONAL_EVENTS;

    const insights = events.map((event) => {
      const supplierPerformance = Array.from(supplierMap.values()).map((data) => ({
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        historicalReliability: data.reliabilityScore || 70,
        peakOrderCapacity: Math.min(100, 50 + (data.totalOrders || 0)),
        averageDelay: data.avgShippingDays || 10,
        priceStability: Math.max(0, 100 - (data.refundRate || 0) * 5),
        userRating: Math.min(5, (data.reliabilityScore || 70) / 20),
      }));

      const recommendations = [
        {
          tier: getTier(
            supplierPerformance.reduce((sum, s) => sum + s.historicalReliability, 0) / Math.max(1, supplierPerformance.length),
            supplierPerformance.reduce((sum, s) => sum + s.peakOrderCapacity, 0) / Math.max(1, supplierPerformance.length)
          ),
          supplierIds: supplierPerformance.map((s) => s.supplierId),
          reason: "Based on historical performance and capacity metrics",
        },
      ];

      return {
        id: `${event.season}-${Date.now()}`,
        season: event.season,
        eventName: event.eventName,
        startDate: event.startDate,
        endDate: event.endDate,
        supplierPerformance,
        recommendations,
        preparationTips: [
          "Order samples 4-6 weeks before the event",
          "Confirm stock levels with top suppliers",
          "Negotiate bulk pricing for seasonal inventory",
          "Set up backup suppliers for critical products",
        ],
        daysUntilEvent: daysUntil(event.startDate),
      };
    });

    return NextResponse.json({ insights });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

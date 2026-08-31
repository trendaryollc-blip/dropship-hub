import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

interface SupplierScore {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  avgShippingDays: number;
  onTimeDeliveryRate: number;
  defectRate: number;
  refundRate: number;
  communicationScore: number;
  overallReliability: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D";
  trend: "improving" | "stable" | "declining";
  recentAlerts: string[];
  comparedTo: Array<{
    supplierId: string;
    supplierName: string;
    metric: string;
    theirValue: number;
    ourValue: number;
    advantage: "us" | "them" | "tie";
  }>;
}

function calculateReliabilityScore(metrics: {
  onTimeRate: number;
  defectRate: number;
  refundRate: number;
  communicationScore: number;
  orderCount: number;
}): number {
  let score = 50;

  // On-time delivery (30% weight)
  score += (metrics.onTimeRate - 50) * 0.3;

  // Defect rate (25% weight) - lower is better
  if (metrics.defectRate < 1) score += 15;
  else if (metrics.defectRate < 3) score += 10;
  else if (metrics.defectRate < 5) score += 5;
  else if (metrics.defectRate > 10) score -= 15;
  else if (metrics.defectRate > 5) score -= 5;

  // Refund rate (20% weight) - lower is better
  if (metrics.refundRate < 2) score += 12;
  else if (metrics.refundRate < 5) score += 6;
  else if (metrics.refundRate > 10) score -= 12;
  else if (metrics.refundRate > 5) score -= 6;

  // Communication score (15% weight)
  score += (metrics.communicationScore - 50) * 0.15;

  // Order count bonus (10% weight) - more data = more confidence
  if (metrics.orderCount >= 20) score += 5;
  else if (metrics.orderCount >= 10) score += 3;
  else if (metrics.orderCount < 3) score -= 5;

  return Math.max(10, Math.min(95, Math.round(score)));
}

function getGrade(score: number): SupplierScore["grade"] {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  return "D";
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();

    // Get all fulfillment orders with supplier data
    const ordersSnap = await db
      .collection("users")
      .doc(uid)
      .collection("fulfillmentOrders")
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();

    const sampleOrdersSnap = await db
      .collection("users")
      .doc(uid)
      .collection("sampleOrders")
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();

    const allOrders = [
      ...ordersSnap.docs.map((d) => d.data()),
      ...sampleOrdersSnap.docs.map((d) => d.data()),
    ];

    if (allOrders.length === 0) {
      return NextResponse.json({
        suppliers: [],
        message: "No order data yet. Place orders to build supplier reliability scores.",
      });
    }

    // Group orders by supplier
    const supplierMap = new Map<string, {
      orders: Array<{
        status: string;
        shippingDays?: number;
        deliveredAt?: string;
        createdAt: string;
        defectReported?: boolean;
        refunded?: boolean;
      }>;
    }>();

    for (const order of allOrders) {
      const supplier = (order.selectedSupplier as string) || (order.source as string) || "Unknown";
      if (!supplierMap.has(supplier)) {
        supplierMap.set(supplier, { orders: [] });
      }
      const existing = supplierMap.get(supplier);
      if (existing) existing.orders.push({
        status: (order.status as string) || "pending",
        shippingDays: order.shippingDays as number | undefined,
        deliveredAt: order.deliveredAt as string | undefined,
        createdAt: (order.createdAt as string) || new Date().toISOString(),
        defectReported: order.defectReported as boolean | undefined,
        refunded: order.refunded as boolean | undefined,
      });
    }

    // Calculate scores for each supplier
    const suppliers: SupplierScore[] = [];

    for (const [supplierId, data] of supplierMap) {
      const orders = data.orders;
      const totalOrders = orders.length;

      const deliveredOrders = orders.filter((o) => o.status === "delivered" || o.shippingDays);
      const avgShippingDays = deliveredOrders.length > 0
        ? deliveredOrders.reduce((sum, o) => sum + (o.shippingDays || 0), 0) / deliveredOrders.length
        : 0;

      const onTimeOrders = deliveredOrders.filter((o) => (o.shippingDays || 0) <= 15);
      const onTimeDeliveryRate = deliveredOrders.length > 0
        ? Math.round((onTimeOrders.length / deliveredOrders.length) * 100)
        : 50;

      const defectOrders = orders.filter((o) => o.defectReported);
      const defectRate = totalOrders > 0
        ? Math.round((defectOrders.length / totalOrders) * 100)
        : 0;

      const refundedOrders = orders.filter((o) => o.refunded);
      const refundRate = totalOrders > 0
        ? Math.round((refundedOrders.length / totalOrders) * 100)
        : 0;

      const communicationScore = Math.min(95, 50 + totalOrders * 2);

      const overallReliability = calculateReliabilityScore({
        onTimeRate: onTimeDeliveryRate,
        defectRate,
        refundRate,
        communicationScore,
        orderCount: totalOrders,
      });

      // Determine trend based on recent vs older orders
      const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const recentHalf = sortedOrders.slice(0, Math.ceil(sortedOrders.length / 2));
      const olderHalf = sortedOrders.slice(Math.ceil(sortedOrders.length / 2));

      const recentDefects = recentHalf.filter((o) => o.defectReported).length / Math.max(1, recentHalf.length);
      const olderDefects = olderHalf.length > 0 ? olderHalf.filter((o) => o.defectReported).length / olderHalf.length : recentDefects;

      let trend: SupplierScore["trend"] = "stable";
      if (recentDefects < olderDefects * 0.8) trend = "improving";
      else if (recentDefects > olderDefects * 1.2) trend = "declining";

      const recentAlerts: string[] = [];
      if (defectRate > 5) recentAlerts.push(`${defectRate}% defect rate detected`);
      if (refundRate > 5) recentAlerts.push(`${refundRate}% refund rate detected`);
      if (avgShippingDays > 20) recentAlerts.push(`Average shipping time is ${avgShippingDays.toFixed(0)} days`);
      if (trend === "declining") recentAlerts.push("Performance is declining — monitor closely");

      suppliers.push({
        supplierId,
        supplierName: supplierId,
        totalOrders,
        avgShippingDays: Math.round(avgShippingDays * 10) / 10,
        onTimeDeliveryRate,
        defectRate,
        refundRate,
        communicationScore,
        overallReliability,
        grade: getGrade(overallReliability),
        trend,
        recentAlerts,
        comparedTo: [],
      });
    }

    // Add comparisons between suppliers
    for (let i = 0; i < suppliers.length; i++) {
      for (let j = i + 1; j < suppliers.length; j++) {
        const a = suppliers[i];
        const b = suppliers[j];

        const metrics = [
          { label: "On-time delivery", aVal: a.onTimeDeliveryRate, bVal: b.onTimeDeliveryRate },
          { label: "Defect rate", aVal: a.defectRate, bVal: b.defectRate, lowerBetter: true },
          { label: "Refund rate", aVal: a.refundRate, bVal: b.refundRate, lowerBetter: true },
          { label: "Shipping speed", aVal: 30 - a.avgShippingDays, bVal: 30 - b.avgShippingDays },
        ];

        for (const m of metrics) {
          const advantage = m.aVal > m.bVal ? "us" : m.bVal > m.aVal ? "them" : "tie";
          a.comparedTo.push({
            supplierId: b.supplierId,
            supplierName: b.supplierName,
            metric: m.label,
            theirValue: m.bVal,
            ourValue: m.aVal,
            advantage: advantage as "us" | "them" | "tie",
          });
          b.comparedTo.push({
            supplierId: a.supplierId,
            supplierName: a.supplierName,
            metric: m.label,
            theirValue: m.aVal,
            ourValue: m.bVal,
            advantage: advantage === "us" ? "them" : advantage === "them" ? "us" : "tie",
          });
        }
      }
    }

    suppliers.sort((a, b) => b.overallReliability - a.overallReliability);

    return NextResponse.json({ suppliers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

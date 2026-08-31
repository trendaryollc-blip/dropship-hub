import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { SupplierPerformanceSchema, validateBody } from "@/lib/validation";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";

    const db = await getAdminDB();

    if (type === "alerts") {
      const snap = await db.collection("users").doc(uid).collection("supplierAlerts").orderBy("createdAt", "desc").limit(20).get();
      const alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ alerts });
    }

    if (type === "comparison") {
      const snap = await db.collection("users").doc(uid).collection("supplierPerformance").get();
      const records = snap.docs.map((d) => d.data());

      // Group by supplierId and get latest snapshot for each
      const supplierMap = new Map<string, Record<string, unknown>>();
      for (const r of records) {
        const sid = r.supplierId as string;
        if (!supplierMap.has(sid)) {
          supplierMap.set(sid, r);
        }
      }

      const comparison = Array.from(supplierMap.values()).map((s) => ({
        name: s.supplierName || "Unknown",
        reliabilityScore: s.reliabilityScore || 0,
        refundRate: s.refundRate || 0,
        avgShippingDays: s.avgShippingDays || 0,
        complaintRate: s.complaintRate || 0,
        stockReliability: s.stockReliability || 0,
        priceCompetitiveness: 75,
        totalOrders: 0,
      }));

      return NextResponse.json({ comparison });
    }

    // Default: supplier performances (latest per supplier)
    const snap = await db.collection("users").doc(uid).collection("supplierPerformance").orderBy("createdAt", "desc").limit(100).get();
    const records = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>;

    // Group by supplierId and get latest for each
    const supplierMap = new Map<string, Record<string, unknown>>();
    for (const r of records) {
      const sid = r.supplierId as string;
      if (!supplierMap.has(sid)) {
        supplierMap.set(sid, r);
      }
    }

    const suppliers = Array.from(supplierMap.values()).map((s) => ({
      supplierId: s.supplierId || "",
      supplierName: s.supplierName || "Unknown",
      reliabilityScore: s.reliabilityScore || 0,
      reliabilityTrend: s.reliabilityTrend || 0,
      refundRate: s.refundRate || 0,
      refundRateTrend: s.refundRateTrend || 0,
      avgShippingDays: s.avgShippingDays || 0,
      shippingTrend: s.shippingTrend || 0,
      complaintRate: s.complaintRate || 0,
      complaintTrend: s.complaintTrend || 0,
      stockReliability: s.stockReliability || 0,
      stockTrend: s.stockTrend || 0,
      communicationScore: s.communicationScore || 0,
      qualityScore: s.qualityScore || 0,
      totalOrders: s.totalOrders || 0,
      responseTimeHours: s.responseTimeHours || 0,
      dailySnapshots: s.dailySnapshots || [],
      status: s.status || "good",
    }));

    return NextResponse.json({ suppliers });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch supplier performance", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(SupplierPerformanceSchema, body);
    if (!validation.success) return validation.response;
    const entry = validation.data;

    const db = await getAdminDB();
    const ref = await db.collection("users").doc(uid).collection("supplierPerformance").add({
      ...entry,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: ref.id });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save supplier performance", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

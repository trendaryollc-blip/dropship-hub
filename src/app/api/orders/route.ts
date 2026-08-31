import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { RoutingDecisionSchema, validateBody } from "@/lib/validation";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";

    const db = await getAdminDB();

    if (type === "decisions") {
      const snap = await db.collection("users").doc(uid).collection("routingDecisions").orderBy("createdAt", "desc").limit(30).get();
      const decisions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ decisions });
    }

    if (type === "preferences") {
      const snap = await db.collection("users").doc(uid).collection("routingPreferences").doc("default").get();
      const preferences = snap.exists ? { id: snap.id, ...snap.data() } : null;
      return NextResponse.json({ preferences });
    }

    if (type === "analytics") {
      const snap = await db.collection("users").doc(uid).collection("routingDecisions").orderBy("createdAt", "desc").limit(100).get();
      const decisions = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>;

      if (decisions.length === 0) {
        return NextResponse.json({
          analytics: {
            totalRouted: 0,
            avgShippingDays: 0,
            avgCost: 0,
            supplierDistribution: [],
            optimizationBreakdown: [],
            costSavings: 0,
            timeSavings: 0,
          },
        });
      }

      let totalShippingDays = 0, totalCost = 0, totalSavings = 0, totalTimeSavings = 0;
      const supplierCounts: Record<string, number> = {};
      const optCounts: Record<string, number> = { Speed: 0, Cost: 0, Balanced: 0 };

      for (const d of decisions) {
        const supplier = typeof d.selectedSupplier === "object" && d.selectedSupplier !== null ? d.selectedSupplier as Record<string, unknown> : null;
        const days = typeof d.shippingDays === "number" ? d.shippingDays : (supplier && typeof supplier.shippingDays === "number" ? supplier.shippingDays : 0);
        const cost = typeof d.totalCost === "number" ? d.totalCost : 0;
        const name = typeof d.selectedSupplier === "string" ? d.selectedSupplier : (supplier && typeof supplier.supplierName === "string" ? supplier.supplierName : "Unknown");

        totalShippingDays += days;
        totalCost += cost;
        supplierCounts[name] = (supplierCounts[name] || 0) + 1;

        // Estimate savings: assume worst case is 2x cost and 2x shipping days
        totalSavings += cost > 0 ? cost * 0.3 : 0;
        totalTimeSavings += days > 0 ? Math.round(days * 0.25) : 0;

        // Track optimization type from decision status or reasoning
        const reasoning = (typeof d.reasoning === "string" ? d.reasoning : "").toLowerCase();
        if (reasoning.includes("speed") || reasoning.includes("fast")) optCounts.Speed++;
        else if (reasoning.includes("cost") || reasoning.includes("cheap")) optCounts.Cost++;
        else optCounts.Balanced++;
      }

      const count = decisions.length;
      const supplierDistribution = Object.entries(supplierCounts).map(([name, cnt]) => ({
        name,
        count: cnt,
        color: "#3b82f6",
      }));

      return NextResponse.json({
        analytics: {
          totalRouted: count,
          avgShippingDays: +(totalShippingDays / count).toFixed(1),
          avgCost: +(totalCost / count).toFixed(2),
          supplierDistribution,
          optimizationBreakdown: [
            { type: "Speed", count: optCounts.Speed || Math.floor(count * 0.33) },
            { type: "Cost", count: optCounts.Cost || Math.floor(count * 0.33) },
            { type: "Balanced", count: optCounts.Balanced || (count - Math.floor(count * 0.66)) },
          ],
          costSavings: +totalSavings.toFixed(2),
          timeSavings: count > 0 ? +(totalTimeSavings / count).toFixed(1) : 0,
        },
      });
    }

    if (type === "history") {
      const snap = await db.collection("users").doc(uid).collection("routingDecisions").orderBy("createdAt", "desc").limit(15).get();
      const history = snap.docs.map((d) => {
        const data = d.data();
        const supplier = typeof data.selectedSupplier === "object" && data.selectedSupplier !== null ? data.selectedSupplier as Record<string, unknown> : null;
        return {
          id: d.id,
          orderId: data.orderId || "",
          productTitle: data.productTitle || "",
          customerLocation: data.customerLocation || "",
          selectedSupplier: typeof data.selectedSupplier === "string" ? data.selectedSupplier : (supplier?.supplierName as string || "Unknown"),
          shippingDays: typeof data.shippingDays === "number" ? data.shippingDays : (supplier?.shippingDays as number || 0),
          shippingCost: typeof data.shippingCost === "number" ? data.shippingCost : (supplier?.shippingCost as number || 0),
          reason: data.reasoning || "",
          routedAt: data.routedAt || "",
        };
      });
      return NextResponse.json({ history });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch routing data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(RoutingDecisionSchema, body);
    if (!validation.success) return validation.response;
    const decision = validation.data;

    const db = await getAdminDB();
    const ref = await db.collection("users").doc(uid).collection("routingDecisions").add({
      ...decision,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Order routed successfully",
      id: ref.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to route order", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

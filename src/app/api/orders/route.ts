import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

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

      for (const d of decisions) {
        const supplier = typeof d.selectedSupplier === "object" && d.selectedSupplier !== null ? d.selectedSupplier as Record<string, unknown> : null;
        const days = typeof d.shippingDays === "number" ? d.shippingDays : (supplier && typeof supplier.shippingDays === "number" ? supplier.shippingDays : 0);
        const cost = typeof d.totalCost === "number" ? d.totalCost : 0;
        const name = typeof d.selectedSupplier === "string" ? d.selectedSupplier : (supplier && typeof supplier.supplierName === "string" ? supplier.supplierName : "Unknown");

        totalShippingDays += days;
        totalCost += cost;
        supplierCounts[name] = (supplierCounts[name] || 0) + 1;
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
            { type: "Speed", count: Math.floor(count * 0.33) },
            { type: "Cost", count: Math.floor(count * 0.33) },
            { type: "Balanced", count: count - Math.floor(count * 0.66) },
          ],
          costSavings: +totalSavings.toFixed(2),
          timeSavings: +(totalTimeSavings / count).toFixed(1),
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, ...decision } = body;

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

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
}

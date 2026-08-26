import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { DocumentData } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const db = await getAdminDB();

    if (type === "alerts") {
      const snap = await db.collection("users").doc(uid).collection("lifecycleAlerts").orderBy("createdAt", "desc").limit(20).get();
      const alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ alerts });
    }

    if (type === "stages") {
      const snap = await db.collection("users").doc(uid).collection("productLifecycle").get();
      const products = snap.docs.map((d) => d.data() as DocumentData);
      const stages = ["discovery", "testing", "winning", "scaling", "saturation", "sunset"];
      const distribution = stages.map((stage) => ({
        stage,
        count: products.filter((p) => p.currentStage === stage).length,
        products: products.filter((p) => p.currentStage === stage).map((p) => (p.productTitle as string) || "Unknown"),
      }));
      return NextResponse.json({ stages: distribution });
    }

    // Default: products
    const snap = await db.collection("users").doc(uid).collection("productLifecycle").orderBy("createdAt", "desc").limit(50).get();
    const lifecycleProducts = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        productId: data.productId || d.id,
        productTitle: data.productTitle || "Unknown Product",
        productImage: data.productImage || "",
        category: data.category || "",
        currentStage: data.currentStage || "discovery",
        stageEnteredAt: data.stageEnteredAt || data.createdAt || new Date().toISOString(),
        daysInStage: data.daysInStage || 0,
        totalDaysTracked: data.totalDaysTracked || 0,
        snapshots: [],
        metrics: data.metrics || {
          totalOrders: 0,
          totalRevenue: 0,
          totalProfit: 0,
          avgProfitMargin: 0,
          competitionCount: 0,
          searchVolume: 0,
          trendDirection: "stable",
        },
        alerts: [],
        recommendations: data.recommendations || [],
      };
    });

    return NextResponse.json({ products: lifecycleProducts });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch lifecycle data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, ...entry } = body;

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const ref = await db.collection("users").doc(uid).collection("productLifecycle").add({
      ...entry,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: ref.id });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save lifecycle data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

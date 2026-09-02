import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { generateProfitSummary, generateProfitAlerts, calculateProfitByProduct, calculateProfitByPlatform } from "@/lib/finance/realtime-profit";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "summary";

    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("profitEntries").orderBy("createdAt", "desc").limit(500).get();
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>;

    const profitOrders = orders.map((o) => ({
      orderId: typeof o.orderId === "string" ? o.orderId : String(o.id || ""),
      orderDate: typeof o.date === "string" ? o.date : "",
      productTitle: typeof o.productTitle === "string" ? o.productTitle : "Unknown",
      productImage: typeof o.productImage === "string" ? o.productImage : undefined,
      platform: typeof o.platform === "string" ? o.platform : "Unknown",
      supplier: typeof o.supplier === "string" ? o.supplier : "Unknown",
      revenue: typeof o.revenue === "number" ? o.revenue : 0,
      quantity: typeof o.quantity === "number" ? o.quantity : 1,
      cogs: typeof o.cogs === "number" ? o.cogs : 0,
      shippingCost: typeof o.shippingCost === "number" ? o.shippingCost : 0,
      platformFee: typeof o.platformFee === "number" ? o.platformFee : 0,
      paymentProcessing: typeof o.paymentProcessing === "number" ? o.paymentProcessing : 0,
      refunds: typeof o.refunds === "number" ? o.refunds : 0,
      adSpend: typeof o.adSpend === "number" ? o.adSpend : 0,
      otherCosts: typeof o.otherCosts === "number" ? o.otherCosts : 0,
      taxAmount: typeof o.taxAmount === "number" ? o.taxAmount : 0,
      netProfit: typeof o.netProfit === "number" ? o.netProfit : 0,
      profitMargin: typeof o.profitMargin === "number" ? o.profitMargin : 0,
      status: (typeof o.status === "string" ? o.status : "completed") as "completed" | "pending" | "refunded" | "disputed",
    }));

    if (action === "summary") {
      const summary = generateProfitSummary(profitOrders);
      return NextResponse.json({ success: true, summary });
    }

    if (action === "alerts") {
      const alerts = generateProfitAlerts(profitOrders);
      return NextResponse.json({ success: true, alerts });
    }

    if (action === "by_product") {
      const byProduct = calculateProfitByProduct(profitOrders);
      return NextResponse.json({ success: true, breakdown: byProduct });
    }

    if (action === "by_platform") {
      const byPlatform = calculateProfitByPlatform(profitOrders);
      return NextResponse.json({ success: true, breakdown: byPlatform });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch profit data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

function getAdminDB(): FirebaseFirestore.Firestore {
  throw new Error("Not implemented");
}

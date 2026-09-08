import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { CustomsCalculationInputSchema } from "@/types/shipping";
import { calculateCustoms, lookupHSCode } from "@/lib/shipping/customs-calculator";
import { saveCustomsEstimate, getCustomsEstimateHistory } from "@/lib/data/shipping-rates";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const action = req.nextUrl.searchParams.get("action");

    if (action === "history") {
      const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
      const history = await getCustomsEstimateHistory(uid, limit);
      return NextResponse.json({ history });
    }

    if (action === "lookup") {
      const itemName = req.nextUrl.searchParams.get("itemName");
      if (!itemName) {
        return NextResponse.json({ error: "itemName required for lookup" }, { status: 400 });
      }
      const result = lookupHSCode(itemName);
      return NextResponse.json({ result });
    }

    const originCountry = req.nextUrl.searchParams.get("originCountry");
    const destinationCountry = req.nextUrl.searchParams.get("destinationCountry");
    const itemsParam = req.nextUrl.searchParams.get("items");
    const currency = req.nextUrl.searchParams.get("currency") || "USD";
    const shippingCost = req.nextUrl.searchParams.get("shippingCost") || "0";

    if (!originCountry || !destinationCountry || !itemsParam) {
      return NextResponse.json({ error: "Missing required parameters: originCountry, destinationCountry, items (JSON array)" }, { status: 400 });
    }

    let items;
    try {
      items = JSON.parse(itemsParam);
    } catch {
      return NextResponse.json({ error: "Invalid items JSON" }, { status: 400 });
    }

    const parsed = CustomsCalculationInputSchema.safeParse({
      originCountry,
      destinationCountry,
      items,
      currency,
      shippingCost: parseFloat(shippingCost),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const result = calculateCustoms(
      parsed.data.originCountry,
      parsed.data.destinationCountry,
      parsed.data.items,
      parsed.data.currency,
      parsed.data.shippingCost
    );

    await saveCustomsEstimate(uid, {
      originCountry: parsed.data.originCountry,
      destinationCountry: parsed.data.destinationCountry,
      totalDeclaredValue: parsed.data.items.reduce((sum, item) => sum + item.unitValue * item.quantity, 0),
      totalTaxes: result.summary.totalDuties + result.summary.totalVAT + result.summary.totalTaxes,
      currency: parsed.data.currency,
      itemCount: parsed.data.items.length,
    }).catch(() => {});

    return NextResponse.json({
      requestId: `cs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      originCountry: parsed.data.originCountry,
      destinationCountry: parsed.data.destinationCountry,
      totalDeclaredValue: parsed.data.items.reduce((sum, item) => sum + item.unitValue * item.quantity, 0),
      totalWeight: parsed.data.items.reduce((sum, item) => sum + item.weightKg * item.quantity, 0),
      shippingCost: parsed.data.shippingCost,
      currency: parsed.data.currency,
      items: result.items,
      summary: result.summary,
      deMinimis: result.deMinimis,
      warnings: result.warnings,
      tips: result.tips,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to calculate customs", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

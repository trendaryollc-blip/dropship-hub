import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { RateComparisonInputSchema } from "@/types/shipping";
import { compareRates } from "@/lib/shipping/carrier-rates";
import { saveRateComparison } from "@/lib/data/shipping-rates";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const originCountry = req.nextUrl.searchParams.get("originCountry");
    const destinationCountry = req.nextUrl.searchParams.get("destinationCountry");
    const weightKg = req.nextUrl.searchParams.get("weightKg");
    const lengthCm = req.nextUrl.searchParams.get("lengthCm");
    const widthCm = req.nextUrl.searchParams.get("widthCm");
    const heightCm = req.nextUrl.searchParams.get("heightCm");
    const declaredValue = req.nextUrl.searchParams.get("declaredValue");
    const currency = req.nextUrl.searchParams.get("currency") || "USD";
    const carriers = req.nextUrl.searchParams.get("carriers");

    if (!originCountry || !destinationCountry || !weightKg || !lengthCm || !widthCm || !heightCm || !declaredValue) {
      return NextResponse.json({ error: "Missing required parameters: originCountry, destinationCountry, weightKg, lengthCm, widthCm, heightCm, declaredValue" }, { status: 400 });
    }

    const parsed = RateComparisonInputSchema.safeParse({
      originCountry,
      destinationCountry,
      weightKg: parseFloat(weightKg),
      lengthCm: parseFloat(lengthCm),
      widthCm: parseFloat(widthCm),
      heightCm: parseFloat(heightCm),
      declaredValue: parseFloat(declaredValue),
      currency,
      carriers: carriers ? carriers.split(",") : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const result = compareRates(parsed.data);

    await saveRateComparison(uid, {
      originCountry: parsed.data.originCountry,
      destinationCountry: parsed.data.destinationCountry,
      weightKg: parsed.data.weightKg,
      selectedCarrier: result.bestValue?.carrierId || "none",
      selectedCost: result.bestValue?.cost || 0,
      cheapestCost: result.cheapest?.cost || 0,
      savings: (result.cheapest?.cost || 0) - (result.bestValue?.cost || 0),
    }).catch(() => {});

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to compare rates", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

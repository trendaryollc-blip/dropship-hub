import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { DeliveryPredictionInputSchema } from "@/types/shipping";
import { predictDelivery, predictDeliveryForAllCarriers } from "@/lib/shipping/delivery-prediction";

export const GET = withAuth(async (req: NextRequest, _uid: string) => {
  try {
    const carrierId = req.nextUrl.searchParams.get("carrierId");
    const originCountry = req.nextUrl.searchParams.get("originCountry");
    const destinationCountry = req.nextUrl.searchParams.get("destinationCountry");
    const weightKg = req.nextUrl.searchParams.get("weightKg");
    const serviceLevel = req.nextUrl.searchParams.get("serviceLevel");
    const shipDate = req.nextUrl.searchParams.get("shipDate");
    const allCarriers = req.nextUrl.searchParams.get("allCarriers") === "true";

    if (!originCountry || !destinationCountry || !weightKg) {
      return NextResponse.json({ error: "Missing required parameters: originCountry, destinationCountry, weightKg" }, { status: 400 });
    }

    if (allCarriers) {
      const predictions = predictDeliveryForAllCarriers(
        originCountry,
        destinationCountry,
        parseFloat(weightKg),
        shipDate || undefined
      );
      return NextResponse.json({ predictions });
    }

    if (!carrierId || !serviceLevel) {
      return NextResponse.json({ error: "Missing required parameters: carrierId, serviceLevel (or set allCarriers=true)" }, { status: 400 });
    }

    const parsed = DeliveryPredictionInputSchema.safeParse({
      carrierId,
      originCountry,
      destinationCountry,
      weightKg: parseFloat(weightKg),
      serviceLevel,
      shipDate: shipDate || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const prediction = predictDelivery(parsed.data);
    return NextResponse.json({ prediction });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to predict delivery", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

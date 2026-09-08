import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { AutoSelectInputSchema } from "@/types/shipping";
import { autoSelectCarrier } from "@/lib/shipping/auto-selector";

export const GET = withAuth(async (req: NextRequest, _uid: string) => {
  try {
    const originCountry = req.nextUrl.searchParams.get("originCountry");
    const destinationCountry = req.nextUrl.searchParams.get("destinationCountry");
    const weightKg = req.nextUrl.searchParams.get("weightKg");
    const lengthCm = req.nextUrl.searchParams.get("lengthCm");
    const widthCm = req.nextUrl.searchParams.get("widthCm");
    const heightCm = req.nextUrl.searchParams.get("heightCm");
    const declaredValue = req.nextUrl.searchParams.get("declaredValue");
    const optimization = req.nextUrl.searchParams.get("optimization") || "balanced";
    const maxBudget = req.nextUrl.searchParams.get("maxBudget");
    const maxDeliveryDays = req.nextUrl.searchParams.get("maxDeliveryDays");
    const requiredTracking = req.nextUrl.searchParams.get("requiredTracking") === "true";
    const requiredInsurance = req.nextUrl.searchParams.get("requiredInsurance") === "true";
    const excludeCarriers = req.nextUrl.searchParams.get("excludeCarriers");
    const currency = req.nextUrl.searchParams.get("currency") || "USD";

    if (!originCountry || !destinationCountry || !weightKg || !lengthCm || !widthCm || !heightCm || !declaredValue) {
      return NextResponse.json({ error: "Missing required parameters: originCountry, destinationCountry, weightKg, lengthCm, widthCm, heightCm, declaredValue" }, { status: 400 });
    }

    const parsed = AutoSelectInputSchema.safeParse({
      originCountry,
      destinationCountry,
      weightKg: parseFloat(weightKg),
      lengthCm: parseFloat(lengthCm),
      widthCm: parseFloat(widthCm),
      heightCm: parseFloat(heightCm),
      declaredValue: parseFloat(declaredValue),
      optimization,
      maxBudget: maxBudget ? parseFloat(maxBudget) : undefined,
      maxDeliveryDays: maxDeliveryDays ? parseFloat(maxDeliveryDays) : undefined,
      requiredTracking,
      requiredInsurance,
      excludeCarriers: excludeCarriers ? excludeCarriers.split(",") as ("cj" | "aliexpress_standard" | "epacket" | "dhl" | "fedex")[] : undefined,
      currency,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const result = autoSelectCarrier(parsed.data);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to auto-select carrier", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

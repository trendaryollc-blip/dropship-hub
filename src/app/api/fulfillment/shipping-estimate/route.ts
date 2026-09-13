import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

interface ShippingItem {
  weight?: number;
  dimensions?: { l: number; w: number; h: number };
  supplierId: string;
}

interface ShippingDestination {
  country: string;
  state?: string;
  zipCode?: string;
}

interface ShippingRequest {
  items: ShippingItem[];
  destination: ShippingDestination;
  shippingMethod: "standard" | "express" | "economy";
}

const BASE_RATES: Record<string, number> = {
  cj: 4.99,
  aliexpress: 5.99,
  amazon: 3.99,
  alibaba: 7.99,
  temu: 5.49,
};

const METHOD_MULTIPLIERS: Record<string, number> = {
  express: 2.0,
  standard: 1.0,
  economy: 0.7,
};

const DELIVERY_DAYS: Record<string, { min: number; max: number }> = {
  express: { min: 3, max: 7 },
  standard: { min: 7, max: 15 },
  economy: { min: 15, max: 30 },
};

const CARRIERS: Record<string, string> = {
  express: "FedEx / DHL Express",
  standard: "USPS / UPS",
  economy: "ePacket / Cainiao",
};

function computeShippingEstimate(data: ShippingRequest) {
  const { items, destination, shippingMethod } = data;

  // Calculate average base rate across all items
  let totalBaseRate = 0;
  for (const item of items) {
    const supplierRate = BASE_RATES[item.supplierId] ?? 6.99;
    totalBaseRate += supplierRate;
  }
  const baseRate = items.length > 0 ? totalBaseRate / items.length : 6.99;

  const methodMultiplier = METHOD_MULTIPLIERS[shippingMethod] ?? 1.0;
  const internationalSurcharge = destination.country !== "US" ? 3.00 : 0;

  const subtotal = baseRate * methodMultiplier * items.length;
  const total = Math.round((subtotal + internationalSurcharge) * 100) / 100;

  const estimatedDays = DELIVERY_DAYS[shippingMethod] ?? DELIVERY_DAYS.standard;
  const carrier = CARRIERS[shippingMethod] ?? "Standard Carrier";

  return {
    estimatedCost: total,
    estimatedDays,
    carrier,
    method: shippingMethod,
    breakdown: {
      baseRate: Math.round(baseRate * 100) / 100,
      methodMultiplier,
      internationalSurcharge,
      total,
    },
  };
}

export const POST = withAuth(async (req: NextRequest, _uid: string) => {
  try {
    const body: ShippingRequest = await req.json();
    const { items, destination, shippingMethod } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    if (!destination || !destination.country) {
      return NextResponse.json({ error: "Destination country is required" }, { status: 400 });
    }

    if (!shippingMethod || !["standard", "express", "economy"].includes(shippingMethod)) {
      return NextResponse.json({ error: "Valid shipping method is required (standard, express, economy)" }, { status: 400 });
    }

    const estimate = computeShippingEstimate({ items, destination, shippingMethod });

    return NextResponse.json(estimate);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to compute shipping estimate", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

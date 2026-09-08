import type { CarrierId, CarrierRateRequest, CarrierRateResponse, RateComparisonRequest, RateComparisonResult } from "@/types/shipping";
import { CARRIER_MAP } from "@/types/shipping";
import { getZone } from "./country-data";

// ── Base Rate Tables (USD) ────────────────────────────────────────────────────
// Real-world inspired base rates per carrier per service level

interface CarrierBaseRate {
  carrierId: CarrierId;
  serviceLevel: "economy" | "standard" | "express" | "priority";
  baseCost: number;
  costPerKg: number;
  minDays: number;
  maxDays: number;
  reliability: number;
  trackingIncluded: boolean;
  insuranceIncluded: boolean;
  insuranceCostRate: number;
  guaranteedDelivery: boolean;
  customsHandled: boolean;
}

const CARRIER_BASE_RATES: CarrierBaseRate[] = [
  // CJ Dropshipping
  { carrierId: "cj", serviceLevel: "economy", baseCost: 2.50, costPerKg: 1.80, minDays: 15, maxDays: 25, reliability: 82, trackingIncluded: true, insuranceIncluded: false, insuranceCostRate: 0.02, guaranteedDelivery: false, customsHandled: false },
  { carrierId: "cj", serviceLevel: "standard", baseCost: 3.50, costPerKg: 2.50, minDays: 10, maxDays: 18, reliability: 85, trackingIncluded: true, insuranceIncluded: false, insuranceCostRate: 0.02, guaranteedDelivery: false, customsHandled: false },
  { carrierId: "cj", serviceLevel: "express", baseCost: 5.00, costPerKg: 3.50, minDays: 7, maxDays: 12, reliability: 88, trackingIncluded: true, insuranceIncluded: true, insuranceCostRate: 0.01, guaranteedDelivery: false, customsHandled: false },
  { carrierId: "cj", serviceLevel: "priority", baseCost: 8.00, costPerKg: 5.00, minDays: 5, maxDays: 8, reliability: 90, trackingIncluded: true, insuranceIncluded: true, insuranceCostRate: 0.01, guaranteedDelivery: true, customsHandled: false },

  // AliExpress Standard
  { carrierId: "aliexpress_standard", serviceLevel: "economy", baseCost: 1.50, costPerKg: 1.20, minDays: 18, maxDays: 35, reliability: 75, trackingIncluded: true, insuranceIncluded: false, insuranceCostRate: 0.03, guaranteedDelivery: false, customsHandled: false },
  { carrierId: "aliexpress_standard", serviceLevel: "standard", baseCost: 2.50, costPerKg: 1.80, minDays: 12, maxDays: 25, reliability: 80, trackingIncluded: true, insuranceIncluded: false, insuranceCostRate: 0.03, guaranteedDelivery: false, customsHandled: false },
  { carrierId: "aliexpress_standard", serviceLevel: "express", baseCost: 4.00, costPerKg: 2.80, minDays: 8, maxDays: 15, reliability: 83, trackingIncluded: true, insuranceIncluded: true, insuranceCostRate: 0.02, guaranteedDelivery: false, customsHandled: false },

  // ePacket
  { carrierId: "epacket", serviceLevel: "economy", baseCost: 1.00, costPerKg: 1.50, minDays: 12, maxDays: 20, reliability: 78, trackingIncluded: true, insuranceIncluded: false, insuranceCostRate: 0.02, guaranteedDelivery: false, customsHandled: false },
  { carrierId: "epacket", serviceLevel: "standard", baseCost: 2.00, costPerKg: 2.00, minDays: 8, maxDays: 15, reliability: 82, trackingIncluded: true, insuranceIncluded: false, insuranceCostRate: 0.02, guaranteedDelivery: false, customsHandled: false },
  { carrierId: "epacket", serviceLevel: "express", baseCost: 3.50, costPerKg: 3.00, minDays: 5, maxDays: 10, reliability: 85, trackingIncluded: true, insuranceIncluded: true, insuranceCostRate: 0.015, guaranteedDelivery: false, customsHandled: false },

  // DHL Express
  { carrierId: "dhl", serviceLevel: "economy", baseCost: 8.00, costPerKg: 5.00, minDays: 5, maxDays: 10, reliability: 92, trackingIncluded: true, insuranceIncluded: false, insuranceCostRate: 0.015, guaranteedDelivery: false, customsHandled: true },
  { carrierId: "dhl", serviceLevel: "standard", baseCost: 12.00, costPerKg: 7.00, minDays: 3, maxDays: 7, reliability: 95, trackingIncluded: true, insuranceIncluded: true, insuranceCostRate: 0.01, guaranteedDelivery: true, customsHandled: true },
  { carrierId: "dhl", serviceLevel: "express", baseCost: 18.00, costPerKg: 10.00, minDays: 2, maxDays: 5, reliability: 97, trackingIncluded: true, insuranceIncluded: true, insuranceCostRate: 0.01, guaranteedDelivery: true, customsHandled: true },
  { carrierId: "dhl", serviceLevel: "priority", baseCost: 25.00, costPerKg: 14.00, minDays: 1, maxDays: 3, reliability: 98, trackingIncluded: true, insuranceIncluded: true, insuranceCostRate: 0.01, guaranteedDelivery: true, customsHandled: true },

  // FedEx
  { carrierId: "fedex", serviceLevel: "economy", baseCost: 7.00, costPerKg: 4.50, minDays: 5, maxDays: 10, reliability: 90, trackingIncluded: true, insuranceIncluded: false, insuranceCostRate: 0.015, guaranteedDelivery: false, customsHandled: true },
  { carrierId: "fedex", serviceLevel: "standard", baseCost: 10.00, costPerKg: 6.00, minDays: 3, maxDays: 7, reliability: 93, trackingIncluded: true, insuranceIncluded: true, insuranceCostRate: 0.01, guaranteedDelivery: true, customsHandled: true },
  { carrierId: "fedex", serviceLevel: "express", baseCost: 15.00, costPerKg: 9.00, minDays: 2, maxDays: 4, reliability: 96, trackingIncluded: true, insuranceIncluded: true, insuranceCostRate: 0.01, guaranteedDelivery: true, customsHandled: true },
  { carrierId: "fedex", serviceLevel: "priority", baseCost: 22.00, costPerKg: 12.00, minDays: 1, maxDays: 3, reliability: 97, trackingIncluded: true, insuranceIncluded: true, insuranceCostRate: 0.01, guaranteedDelivery: true, customsHandled: true },
];

// ── Volumetric Weight Divisor ─────────────────────────────────────────────────

const VOLUMETRIC_DIVISOR = 5000;

// ── Rate Calculation ──────────────────────────────────────────────────────────

export function calculateChargeableWeight(weightKg: number, lengthCm: number, widthCm: number, heightCm: number): number {
  const volumetricWeight = (lengthCm * widthCm * heightCm) / VOLUMETRIC_DIVISOR;
  return Math.max(weightKg, volumetricWeight);
}

export function calculateCarrierRate(
  request: CarrierRateRequest,
  baseRate: CarrierBaseRate
): CarrierRateResponse {
  const carrierConfig = CARRIER_MAP[request.carrierId];
  if (!carrierConfig) {
    return {
      carrierId: request.carrierId,
      carrierName: "Unknown",
      serviceLevel: baseRate.serviceLevel,
      cost: 0,
      currency: request.currency,
      estimatedDays: { min: 0, max: 0 },
      trackingIncluded: false,
      insuranceIncluded: false,
      insuranceCost: 0,
      guaranteedDelivery: false,
      reliabilityScore: 0,
      customsHandled: false,
      error: "Unknown carrier",
    };
  }

  const chargeableWeight = calculateChargeableWeight(request.weightKg, request.lengthCm, request.widthCm, request.heightCm);
  const zoneMultiplier = getZone(request.originCountry, request.destinationCountry);
  const isDomestic = request.originCountry === request.destinationCountry;

  let cost = baseRate.baseCost + (chargeableWeight * baseRate.costPerKg);

  if (!isDomestic) {
    cost *= zoneMultiplier;
  } else {
    cost *= 0.6;
  }

  if (request.declaredValue > 100) {
    cost += request.declaredValue * 0.005;
  }

  const insuranceCost = request.declaredValue * baseRate.insuranceCostRate;
  if (baseRate.insuranceIncluded) {
    cost += insuranceCost;
  }

  cost = Math.round(cost * 100) / 100;

  const dayMultiplier = isDomestic ? 0.6 : zoneMultiplier * 0.8;
  const minDays = Math.max(1, Math.round(baseRate.minDays * dayMultiplier));
  const maxDays = Math.max(minDays + 1, Math.round(baseRate.maxDays * dayMultiplier));

  return {
    carrierId: request.carrierId,
    carrierName: carrierConfig.displayName,
    serviceLevel: baseRate.serviceLevel,
    cost,
    currency: request.currency,
    estimatedDays: { min: minDays, max: maxDays },
    trackingIncluded: baseRate.trackingIncluded,
    insuranceIncluded: baseRate.insuranceIncluded,
    insuranceCost,
    guaranteedDelivery: baseRate.guaranteedDelivery,
    reliabilityScore: baseRate.reliability,
    customsHandled: baseRate.customsHandled,
  };
}

// ── Multi-Carrier Rate Comparison ─────────────────────────────────────────────

export function compareRates(request: RateComparisonRequest): RateComparisonResult {
  const requestId = `rc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const currency = request.currency || "USD";
  const chargeableWeight = calculateChargeableWeight(request.weightKg, request.lengthCm, request.widthCm, request.heightCm);

  const targetCarriers = request.carriers || (["cj", "aliexpress_standard", "epacket", "dhl", "fedex"] as CarrierId[]);

  const rates: CarrierRateResponse[] = [];

  for (const baseRate of CARRIER_BASE_RATES) {
    if (!targetCarriers.includes(baseRate.carrierId)) continue;

    const carrierConfig = CARRIER_MAP[baseRate.carrierId];
    if (request.weightKg > carrierConfig.maxWeightKg) continue;
    if (request.lengthCm > carrierConfig.maxLengthCm || request.widthCm > carrierConfig.maxWidthCm || request.heightCm > carrierConfig.maxHeightCm) continue;

    const rate = calculateCarrierRate(
      {
        carrierId: baseRate.carrierId,
        originCountry: request.originCountry,
        destinationCountry: request.destinationCountry,
        weightKg: request.weightKg,
        lengthCm: request.lengthCm,
        widthCm: request.widthCm,
        heightCm: request.heightCm,
        declaredValue: request.declaredValue,
        currency,
      },
      baseRate
    );

    rates.push(rate);
  }

  rates.sort((a, b) => a.cost - b.cost);

  const validRates = rates.filter((r) => !r.error && r.cost > 0);
  const cheapest = validRates.length > 0 ? validRates.reduce((min, r) => r.cost < min.cost ? r : min, validRates[0]) : null;
  const fastest = validRates.length > 0 ? validRates.reduce((min, r) => r.estimatedDays.min < min.estimatedDays.min ? r : min, validRates[0]) : null;

  let bestValue: CarrierRateResponse | null = null;
  if (validRates.length > 0) {
    bestValue = validRates.reduce((best, r) => {
      const bestScore = calculateValueScore(best);
      const rScore = calculateValueScore(r);
      return rScore > bestScore ? r : best;
    }, validRates[0]);
  }

  const costOptimized = cheapest;
  const speedOptimized = fastest;
  let balancedOptimized: CarrierRateResponse | null = null;
  if (validRates.length > 0) {
    balancedOptimized = validRates.reduce((best, r) => {
      const bestScore = calculateBalancedScore(best, validRates);
      const rScore = calculateBalancedScore(r, validRates);
      return rScore > bestScore ? r : best;
    }, validRates[0]);
  }

  return {
    requestId,
    originCountry: request.originCountry,
    destinationCountry: request.destinationCountry,
    weightKg: request.weightKg,
    dimensions: { length: request.lengthCm, width: request.widthCm, height: request.heightCm },
    chargeableWeight,
    rates,
    cheapest,
    fastest,
    bestValue,
    recommendedByOptimization: {
      cost: costOptimized,
      speed: speedOptimized,
      balanced: balancedOptimized,
    },
    comparedAt: new Date().toISOString(),
  };
}

function calculateValueScore(rate: CarrierRateResponse): number {
  const costScore = rate.cost > 0 ? 1 / rate.cost : 0;
  const speedScore = rate.estimatedDays.max > 0 ? 1 / rate.estimatedDays.max : 0;
  const reliabilityScore = rate.reliabilityScore / 100;
  return costScore * 0.3 + speedScore * 0.4 + reliabilityScore * 0.3;
}

function calculateBalancedScore(rate: CarrierRateResponse, allRates: CarrierRateResponse[]): number {
  const maxCost = Math.max(...allRates.map((r) => r.cost));
  const minCost = Math.min(...allRates.map((r) => r.cost));
  const maxDays = Math.max(...allRates.map((r) => r.estimatedDays.max));
  const minDays = Math.min(...allRates.map((r) => r.estimatedDays.max));

  const costRange = maxCost - minCost || 1;
  const daysRange = maxDays - minDays || 1;

  const normalizedCost = 1 - (rate.cost - minCost) / costRange;
  const normalizedSpeed = 1 - (rate.estimatedDays.max - minDays) / daysRange;
  const reliability = rate.reliabilityScore / 100;

  return normalizedCost * 0.35 + normalizedSpeed * 0.35 + reliability * 0.30;
}

// ── Single Carrier Rate ───────────────────────────────────────────────────────

export function getCarrierRate(request: CarrierRateRequest): CarrierRateResponse {
  const carrierRates = CARRIER_BASE_RATES.filter((r) => r.carrierId === request.carrierId);
  if (carrierRates.length === 0) {
    return {
      carrierId: request.carrierId,
      carrierName: "Unknown",
      serviceLevel: "standard",
      cost: 0,
      currency: request.currency,
      estimatedDays: { min: 0, max: 0 },
      trackingIncluded: false,
      insuranceIncluded: false,
      insuranceCost: 0,
      guaranteedDelivery: false,
      reliabilityScore: 0,
      customsHandled: false,
      error: `No rates found for carrier ${request.carrierId}`,
    };
  }

  const bestRate = carrierRates.reduce((best, r) =>
    r.serviceLevel === "standard" ? r : best
  , carrierRates[0]);

  return calculateCarrierRate(request, bestRate);
}

export function getCarrierRatesByService(carrierId: CarrierId): CarrierBaseRate[] {
  return CARRIER_BASE_RATES.filter((r) => r.carrierId === carrierId);
}

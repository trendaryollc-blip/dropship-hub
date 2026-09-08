import type { CarrierId, AutoSelectRequest, AutoSelectResult, CarrierRateResponse, ShippingOptimization } from "@/types/shipping";
import { compareRates } from "./carrier-rates";
// predictDelivery available if needed: import { predictDelivery } from "./delivery-prediction";

// ── Scoring Weights by Optimization Mode ──────────────────────────────────────

const OPTIMIZATION_WEIGHTS: Record<ShippingOptimization, { cost: number; speed: number; reliability: number; features: number }> = {
  cost: { cost: 0.55, speed: 0.15, reliability: 0.20, features: 0.10 },
  speed: { cost: 0.15, speed: 0.55, reliability: 0.20, features: 0.10 },
  balanced: { cost: 0.30, speed: 0.30, reliability: 0.25, features: 0.15 },
  reliability: { cost: 0.15, speed: 0.15, reliability: 0.55, features: 0.15 },
};

// ── Score Normalization Helpers ───────────────────────────────────────────────

function normalizeCost(cost: number, minCost: number, maxCost: number): number {
  if (maxCost === minCost) return 1;
  return 1 - (cost - minCost) / (maxCost - minCost);
}

function normalizeSpeed(maxDays: number, minMaxDays: number, maxMaxDays: number): number {
  if (maxMaxDays === minMaxDays) return 1;
  return 1 - (maxDays - minMaxDays) / (maxMaxDays - minMaxDays);
}

function normalizeReliability(score: number): number {
  return score / 100;
}

function calculateFeatureScore(rate: CarrierRateResponse, request: AutoSelectRequest): number {
  let score = 0;
  let totalFeatures = 0;

  if (request.requiredTracking) {
    totalFeatures++;
    if (rate.trackingIncluded) score++;
  }

  if (request.requiredInsurance) {
    totalFeatures++;
    if (rate.insuranceIncluded) score++;
  }

  if (request.maxDeliveryDays) {
    totalFeatures++;
    if (rate.estimatedDays.max <= request.maxDeliveryDays) score++;
  }

  totalFeatures++;
  if (rate.guaranteedDelivery) score++;

  totalFeatures++;
  if (rate.customsHandled) score++;

  return totalFeatures > 0 ? score / totalFeatures : 0.5;
}

// ── Constraint Checking ───────────────────────────────────────────────────────

function checkConstraints(
  rate: CarrierRateResponse,
  request: AutoSelectRequest
): { passes: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (request.maxBudget && rate.cost > request.maxBudget) {
    reasons.push(`Cost $${rate.cost.toFixed(2)} exceeds budget $${request.maxBudget.toFixed(2)}`);
  }

  if (request.maxDeliveryDays && rate.estimatedDays.max > request.maxDeliveryDays) {
    reasons.push(`Max delivery ${rate.estimatedDays.max}d exceeds limit ${request.maxDeliveryDays}d`);
  }

  if (request.requiredTracking && !rate.trackingIncluded) {
    reasons.push("Tracking not included");
  }

  if (request.requiredInsurance && !rate.insuranceIncluded) {
    reasons.push("Insurance not included");
  }

  if (rate.error) {
    reasons.push(`Carrier error: ${rate.error}`);
  }

  if (rate.cost <= 0) {
    reasons.push("Invalid cost");
  }

  return { passes: reasons.length === 0, reasons };
}

// ── Main Auto-Selection Algorithm ─────────────────────────────────────────────

export function autoSelectCarrier(request: AutoSelectRequest): AutoSelectResult {
  const requestId = `as_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const weights = OPTIMIZATION_WEIGHTS[request.optimization];

  const comparison = compareRates({
    originCountry: request.originCountry,
    destinationCountry: request.destinationCountry,
    weightKg: request.weightKg,
    lengthCm: request.lengthCm,
    widthCm: request.widthCm,
    heightCm: request.heightCm,
    declaredValue: request.declaredValue,
    currency: request.currency || "USD",
    carriers: request.excludeCarriers
      ? (["cj", "aliexpress_standard", "epacket", "dhl", "fedex"] as CarrierId[]).filter(
          (c) => !request.excludeCarriers?.includes(c)
        )
      : undefined,
  });

  const validRates = comparison.rates.filter((r) => !r.error && r.cost > 0);

  if (validRates.length === 0) {
    return {
      requestId,
      selected: null,
      alternatives: [],
      reasoning: "No carriers available that meet the specified criteria.",
      scoreBreakdown: [],
      optimization: request.optimization,
      appliedConstraints: [],
      selectedAt: new Date().toISOString(),
    };
  }

  const costs = validRates.map((r) => r.cost);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);

  const maxDaysValues = validRates.map((r) => r.estimatedDays.max);
  const minMaxDays = Math.min(...maxDaysValues);
  const maxMaxDays = Math.max(...maxDaysValues);

  const scoreBreakdown = validRates.map((rate) => {
    const costScore = normalizeCost(rate.cost, minCost, maxCost);
    const speedScore = normalizeSpeed(rate.estimatedDays.max, minMaxDays, maxMaxDays);
    const reliabilityScore = normalizeReliability(rate.reliabilityScore);
    const featureScore = calculateFeatureScore(rate, request);

    const totalScore =
      costScore * weights.cost +
      speedScore * weights.speed +
      reliabilityScore * weights.reliability +
      featureScore * weights.features;

    return {
      carrierId: rate.carrierId,
      carrierName: rate.carrierName,
      totalScore: Math.round(totalScore * 1000) / 1000,
      costScore: Math.round(costScore * 100) / 100,
      speedScore: Math.round(speedScore * 100) / 100,
      reliabilityScore: Math.round(reliabilityScore * 100) / 100,
      featureScore: Math.round(featureScore * 100) / 100,
    };
  });

  scoreBreakdown.sort((a, b) => b.totalScore - a.totalScore);

  const appliedConstraints: string[] = [];
  if (request.maxBudget) appliedConstraints.push(`Budget limit: $${request.maxBudget.toFixed(2)}`);
  if (request.maxDeliveryDays) appliedConstraints.push(`Max delivery: ${request.maxDeliveryDays} days`);
  if (request.requiredTracking) appliedConstraints.push("Tracking required");
  if (request.requiredInsurance) appliedConstraints.push("Insurance required");
  if (request.excludeCarriers && request.excludeCarriers.length > 0) {
    appliedConstraints.push(`Excluded: ${request.excludeCarriers.join(", ")}`);
  }

  let selectedRate: CarrierRateResponse | null = null;
  const alternatives: CarrierRateResponse[] = [];

  for (const score of scoreBreakdown) {
    const rate = validRates.find((r) => r.carrierId === score.carrierId);
    if (!rate) continue;

    const constraintCheck = checkConstraints(rate, request);

    if (!selectedRate && constraintCheck.passes) {
      selectedRate = rate;
    } else if (constraintCheck.passes) {
      alternatives.push(rate);
    }
  }

  if (!selectedRate && validRates.length > 0) {
    selectedRate = validRates[0];
    appliedConstraints.push("Note: No carrier passed all constraints; selected best available");
  }

  const reasoning = buildReasoning(selectedRate, request.optimization, weights, scoreBreakdown);

  return {
    requestId,
    selected: selectedRate,
    alternatives: alternatives.slice(0, 4),
    reasoning,
    scoreBreakdown: scoreBreakdown.slice(0, 8),
    optimization: request.optimization,
    appliedConstraints,
    selectedAt: new Date().toISOString(),
  };
}

function buildReasoning(
  selected: CarrierRateResponse | null,
  optimization: ShippingOptimization,
  weights: typeof OPTIMIZATION_WEIGHTS[ShippingOptimization],
  scoreBreakdown: AutoSelectResult["scoreBreakdown"]
): string {
  if (!selected) {
    return "No suitable carrier found for the given criteria.";
  }

  const optDescriptions: Record<ShippingOptimization, string> = {
    cost: "prioritizing lowest cost",
    speed: "prioritizing fastest delivery",
    balanced: "balancing cost, speed, and reliability",
    reliability: "prioritizing carrier reliability and guaranteed delivery",
  };

  const topScores = scoreBreakdown.slice(0, 3);
  const scoreDetails = topScores.map((s) => `${s.carrierName} (score: ${(s.totalScore * 100).toFixed(0)}%)`).join(", ");

  return `Selected ${selected.carrierName} ${optimization} optimization (${optDescriptions[optimization]}). ` +
    `Cost: $${selected.cost.toFixed(2)}, Delivery: ${selected.estimatedDays.min}-${selected.estimatedDays.max} days, ` +
    `Reliability: ${selected.reliabilityScore}%. ` +
    `Top candidates: ${scoreDetails}. ` +
    `Weight distribution — Cost: ${(weights.cost * 100).toFixed(0)}%, Speed: ${(weights.speed * 100).toFixed(0)}%, ` +
    `Reliability: ${(weights.reliability * 100).toFixed(0)}%, Features: ${(weights.features * 100).toFixed(0)}%.`;
}

// ── Quick Select (Lightweight) ────────────────────────────────────────────────

export function quickSelect(
  originCountry: string,
  destinationCountry: string,
  weightKg: number,
  declaredValue: number,
  optimization: ShippingOptimization = "balanced"
): CarrierRateResponse | null {
  const result = autoSelectCarrier({
    originCountry,
    destinationCountry,
    weightKg,
    lengthCm: 15,
    widthCm: 10,
    heightCm: 5,
    declaredValue,
    optimization,
  });

  return result.selected;
}

// ── Batch Selection ───────────────────────────────────────────────────────────

export function batchSelect(
  requests: AutoSelectRequest[]
): AutoSelectResult[] {
  return requests.map((req) => autoSelectCarrier(req));
}

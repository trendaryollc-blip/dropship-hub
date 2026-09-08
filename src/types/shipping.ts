import { z } from "zod";

// ── Carrier Types ─────────────────────────────────────────────────────────────

export type CarrierId = "cj" | "aliexpress_standard" | "epacket" | "dhl" | "fedex";

export interface CarrierConfig {
  id: CarrierId;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  baseUrl: string;
  trackingUrl: string;
  supportsInternational: boolean;
  maxWeightKg: number;
  maxLengthCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
}

export interface CarrierRateRequest {
  carrierId: CarrierId;
  originCountry: string;
  destinationCountry: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValue: number;
  currency: string;
}

export interface CarrierRateResponse {
  carrierId: CarrierId;
  carrierName: string;
  serviceLevel: "economy" | "standard" | "express" | "priority";
  cost: number;
  currency: string;
  estimatedDays: { min: number; max: number };
  trackingIncluded: boolean;
  insuranceIncluded: boolean;
  insuranceCost: number;
  guaranteedDelivery: boolean;
  reliabilityScore: number;
  customsHandled: boolean;
  error?: string;
}

export interface RateComparisonRequest {
  originCountry: string;
  destinationCountry: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValue: number;
  currency?: string;
  carriers?: CarrierId[];
}

export interface RateComparisonResult {
  requestId: string;
  originCountry: string;
  destinationCountry: string;
  weightKg: number;
  dimensions: { length: number; width: number; height: number };
  chargeableWeight: number;
  rates: CarrierRateResponse[];
  cheapest: CarrierRateResponse | null;
  fastest: CarrierRateResponse | null;
  bestValue: CarrierRateResponse | null;
  recommendedByOptimization: {
    cost: CarrierRateResponse | null;
    speed: CarrierRateResponse | null;
    balanced: CarrierRateResponse | null;
  };
  comparedAt: string;
}

// ── Delivery Prediction Types ─────────────────────────────────────────────────

export interface DeliveryPredictionRequest {
  carrierId: CarrierId;
  originCountry: string;
  destinationCountry: string;
  weightKg: number;
  serviceLevel: "economy" | "standard" | "express" | "priority";
  shipDate?: string;
}

export interface DeliveryPredictionResult {
  carrierId: CarrierId;
  carrierName: string;
  originCountry: string;
  destinationCountry: string;
  serviceLevel: string;
  predictedDays: { min: number; max: number; average: number };
  confidence: number;
  riskFactors: DeliveryRiskFactor[];
  shipByDate: string;
  estimatedArrival: { earliest: string; latest: string; average: string };
  historicalAccuracy: number;
  weatherDelayRisk: number;
  customsDelayRisk: number;
  holidayDelayRisk: number;
}

export interface DeliveryRiskFactor {
  type: "weather" | "customs" | "holiday" | "carrier_delay" | "route_complexity" | "peak_season";
  severity: "low" | "medium" | "high";
  description: string;
  estimatedDelayDays: number;
}

export interface ZoneDeliveryData {
  originZone: string;
  destinationZone: string;
  carrierId: CarrierId;
  serviceLevel: string;
  averageDays: number;
  minDays: number;
  maxDays: number;
  sampleSize: number;
  lastUpdated: string;
}

// ── Auto-Selection Types ──────────────────────────────────────────────────────

export type ShippingOptimization = "cost" | "speed" | "balanced" | "reliability";

export interface AutoSelectRequest {
  originCountry: string;
  destinationCountry: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValue: number;
  optimization: ShippingOptimization;
  maxBudget?: number;
  maxDeliveryDays?: number;
  requiredTracking?: boolean;
  requiredInsurance?: boolean;
  excludeCarriers?: CarrierId[];
  currency?: string;
}

export interface AutoSelectResult {
  requestId: string;
  selected: CarrierRateResponse | null;
  alternatives: CarrierRateResponse[];
  reasoning: string;
  scoreBreakdown: {
    carrierId: CarrierId;
    carrierName: string;
    totalScore: number;
    costScore: number;
    speedScore: number;
    reliabilityScore: number;
    featureScore: number;
  }[];
  optimization: ShippingOptimization;
  appliedConstraints: string[];
  selectedAt: string;
}

export interface ShippingPreferences {
  userId: string;
  defaultOptimization: ShippingOptimization;
  defaultMaxBudget: number;
  defaultMaxDeliveryDays: number;
  preferredCarriers: CarrierId[];
  excludedCarriers: CarrierId[];
  requireTracking: boolean;
  requireInsurance: boolean;
  autoSelectEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Customs & Duty Types ──────────────────────────────────────────────────────

export interface CustomsCalculationRequest {
  originCountry: string;
  destinationCountry: string;
  items: CustomsItem[];
  currency?: string;
  shippingCost?: number;
}

export interface CustomsItem {
  name: string;
  hsCode: string;
  quantity: number;
  unitValue: number;
  weightKg: number;
  description?: string;
  originCountry: string;
}

export interface CustomsCalculationResult {
  requestId: string;
  originCountry: string;
  destinationCountry: string;
  totalDeclaredValue: number;
  totalWeight: number;
  shippingCost: number;
  currency: string;
  items: CustomsItemResult[];
  summary: CustomsSummary;
  deMinimis: DeMinimisInfo;
  warnings: CustomsWarning[];
  tips: string[];
  calculatedAt: string;
}

export interface CustomsItemResult {
  name: string;
  hsCode: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  weightKg: number;
  dutyRate: number;
  dutyAmount: number;
  vatRate: number;
  vatAmount: number;
  taxRate: number;
  taxAmount: number;
  totalTaxes: number;
  landedCost: number;
  notes: string[];
}

export interface CustomsSummary {
  subtotal: number;
  shippingCost: number;
  totalDuties: number;
  totalVAT: number;
  totalTaxes: number;
  totalFees: number;
  totalLandedCost: number;
  effectiveTaxRate: number;
  breakdown: { name: string; amount: number; color: string }[];
}

export interface DeMinimisInfo {
  threshold: number;
  currency: string;
  applies: boolean;
  explanation: string;
}

export interface CustomsWarning {
  type: "prohibited" | "restricted" | "high_duty" | "documentation" | "value_threshold";
  severity: "info" | "warning" | "critical";
  message: string;
  item?: string;
}

export interface CountryCustomsData {
  countryCode: string;
  countryName: string;
  currency: string;
  deMinimisThreshold: number;
  deMinimisCurrency: string;
  vatRates: { standard: number; reduced: number[] };
  importDuty: Record<string, number>;
  prohibitedItems: string[];
  restrictedItems: string[];
  requiresCustomsForm: boolean;
  averageClearanceDays: number;
  notes: string[];
}

export interface HSCodeDutyRate {
  hsCode: string;
  description: string;
  dutyRate: number;
  vatRate: number;
  restricted: boolean;
  notes: string;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

export const CarrierRateRequestSchema = z.object({
  carrierId: z.enum(["cj", "aliexpress_standard", "epacket", "dhl", "fedex"]),
  originCountry: z.string().min(2).max(2),
  destinationCountry: z.string().min(2).max(2),
  weightKg: z.number().min(0.01).max(500),
  lengthCm: z.number().min(1).max(300),
  widthCm: z.number().min(1).max(300),
  heightCm: z.number().min(1).max(300),
  declaredValue: z.number().min(0),
  currency: z.string().min(3).max(3).default("USD"),
});

export const RateComparisonInputSchema = z.object({
  originCountry: z.string().min(2).max(2),
  destinationCountry: z.string().min(2).max(2),
  weightKg: z.number().min(0.01).max(500),
  lengthCm: z.number().min(1).max(300),
  widthCm: z.number().min(1).max(300),
  heightCm: z.number().min(1).max(300),
  declaredValue: z.number().min(0),
  currency: z.string().min(3).max(3).optional().default("USD"),
  carriers: z.array(z.enum(["cj", "aliexpress_standard", "epacket", "dhl", "fedex"])).optional(),
});

export const DeliveryPredictionInputSchema = z.object({
  carrierId: z.enum(["cj", "aliexpress_standard", "epacket", "dhl", "fedex"]),
  originCountry: z.string().min(2).max(2),
  destinationCountry: z.string().min(2).max(2),
  weightKg: z.number().min(0.01).max(500),
  serviceLevel: z.enum(["economy", "standard", "express", "priority"]),
  shipDate: z.string().optional(),
});

export const AutoSelectInputSchema = z.object({
  originCountry: z.string().min(2).max(2),
  destinationCountry: z.string().min(2).max(2),
  weightKg: z.number().min(0.01).max(500),
  lengthCm: z.number().min(1).max(300),
  widthCm: z.number().min(1).max(300),
  heightCm: z.number().min(1).max(300),
  declaredValue: z.number().min(0),
  optimization: z.enum(["cost", "speed", "balanced", "reliability"]),
  maxBudget: z.number().min(0).optional(),
  maxDeliveryDays: z.number().min(1).max(90).optional(),
  requiredTracking: z.boolean().optional().default(false),
  requiredInsurance: z.boolean().optional().default(false),
  excludeCarriers: z.array(z.enum(["cj", "aliexpress_standard", "epacket", "dhl", "fedex"])).optional(),
  currency: z.string().min(3).max(3).optional().default("USD"),
});

export const CustomsCalculationInputSchema = z.object({
  originCountry: z.string().min(2).max(2),
  destinationCountry: z.string().min(2).max(2),
  items: z.array(z.object({
    name: z.string().min(1).max(200),
    hsCode: z.string().min(4).max(10),
    quantity: z.number().int().min(1).max(1000),
    unitValue: z.number().min(0),
    weightKg: z.number().min(0),
    description: z.string().max(500).optional(),
    originCountry: z.string().min(2).max(2),
  })).min(1).max(50),
  currency: z.string().min(3).max(3).optional().default("USD"),
  shippingCost: z.number().min(0).optional().default(0),
});

export const ShippingPreferencesInputSchema = z.object({
  defaultOptimization: z.enum(["cost", "speed", "balanced", "reliability"]),
  defaultMaxBudget: z.number().min(0),
  defaultMaxDeliveryDays: z.number().min(1).max(90),
  preferredCarriers: z.array(z.enum(["cj", "aliexpress_standard", "epacket", "dhl", "fedex"])),
  excludedCarriers: z.array(z.enum(["cj", "aliexpress_standard", "epacket", "dhl", "fedex"])),
  requireTracking: z.boolean(),
  requireInsurance: z.boolean(),
  autoSelectEnabled: z.boolean(),
});

export const ShippingRateCacheSchema = z.object({
  cacheKey: z.string(),
  originCountry: z.string(),
  destinationCountry: z.string(),
  weightKg: z.number(),
  rates: z.array(z.object({
    carrierId: z.string(),
    serviceLevel: z.string(),
    cost: z.number(),
    estimatedDaysMin: z.number(),
    estimatedDaysMax: z.number(),
  })),
  createdAt: z.any(),
  expiresAt: z.any(),
});

// ── Carrier Configurations ────────────────────────────────────────────────────

export const CARRIER_CONFIGS: CarrierConfig[] = [
  {
    id: "cj",
    name: "CJ Dropshipping",
    displayName: "CJ Dropshipping",
    icon: "🚚",
    color: "#22c55e",
    baseUrl: "https://developers.cjdropshipping.com/api2.0/v1",
    trackingUrl: "https://tracking.cjdropshipping.com/",
    supportsInternational: true,
    maxWeightKg: 30,
    maxLengthCm: 120,
    maxWidthCm: 80,
    maxHeightCm: 80,
  },
  {
    id: "aliexpress_standard",
    name: "AliExpress Standard",
    displayName: "AliExpress Standard Shipping",
    icon: "🇨🇳",
    color: "#e11d48",
    baseUrl: "https://api-sg.aliexpress.com",
    trackingUrl: "https://global.cainiao.com/",
    supportsInternational: true,
    maxWeightKg: 25,
    maxLengthCm: 100,
    maxWidthCm: 60,
    maxHeightCm: 60,
  },
  {
    id: "epacket",
    name: "ePacket",
    displayName: "ePacket",
    icon: "📦",
    color: "#3b82f6",
    baseUrl: "https://developers.cjdropshipping.com/api2.0/v1",
    trackingUrl: "https://global.cainiao.com/",
    supportsInternational: true,
    maxWeightKg: 5,
    maxLengthCm: 60,
    maxWidthCm: 40,
    maxHeightCm: 40,
  },
  {
    id: "dhl",
    name: "DHL Express",
    displayName: "DHL Express",
    icon: "✈️",
    color: "#f59e0b",
    baseUrl: "https://api-eu.dhl.com",
    trackingUrl: "https://www.dhl.com/",
    supportsInternational: true,
    maxWeightKg: 200,
    maxLengthCm: 300,
    maxWidthCm: 200,
    maxHeightCm: 160,
  },
  {
    id: "fedex",
    name: "FedEx",
    displayName: "FedEx International",
    icon: "📬",
    color: "#6b21a8",
    baseUrl: "https://apis.fedex.com",
    trackingUrl: "https://www.fedex.com/",
    supportsInternational: true,
    maxWeightKg: 250,
    maxLengthCm: 274,
    maxWidthCm: 180,
    maxHeightCm: 150,
  },
];

export const CARRIER_MAP: Record<CarrierId, CarrierConfig> = Object.fromEntries(
  CARRIER_CONFIGS.map((c) => [c.id, c])
) as Record<CarrierId, CarrierConfig>;

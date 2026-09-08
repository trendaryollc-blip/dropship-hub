import type { CarrierId, DeliveryPredictionRequest, DeliveryPredictionResult, DeliveryRiskFactor, ZoneDeliveryData } from "@/types/shipping";
import { CARRIER_MAP } from "@/types/shipping";
import { getCountryData, SHIPPING_ZONES } from "./country-data";

// ── Historical Delivery Data by Zone + Carrier ────────────────────────────────
// Simulated historical averages based on real-world shipping patterns

const ZONE_DELIVERY_DATA: ZoneDeliveryData[] = [
  // CJ Dropshipping - China to various zones
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "cj", serviceLevel: "economy", averageDays: 18, minDays: 12, maxDays: 28, sampleSize: 15000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "cj", serviceLevel: "standard", averageDays: 14, minDays: 8, maxDays: 20, sampleSize: 12000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "cj", serviceLevel: "express", averageDays: 9, minDays: 6, maxDays: 14, sampleSize: 8000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "europe_west", carrierId: "cj", serviceLevel: "economy", averageDays: 20, minDays: 14, maxDays: 30, sampleSize: 10000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "europe_west", carrierId: "cj", serviceLevel: "standard", averageDays: 15, minDays: 10, maxDays: 22, sampleSize: 8000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "europe_west", carrierId: "cj", serviceLevel: "express", averageDays: 10, minDays: 7, maxDays: 15, sampleSize: 5000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "oceania", carrierId: "cj", serviceLevel: "standard", averageDays: 12, minDays: 8, maxDays: 18, sampleSize: 3000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "south_america", carrierId: "cj", serviceLevel: "standard", averageDays: 22, minDays: 15, maxDays: 35, sampleSize: 2000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "asia_southeast", carrierId: "cj", serviceLevel: "standard", averageDays: 8, minDays: 5, maxDays: 12, sampleSize: 4000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "middle_east", carrierId: "cj", serviceLevel: "standard", averageDays: 12, minDays: 8, maxDays: 18, sampleSize: 2500, lastUpdated: "2026-01-15" },

  // AliExpress Standard - China to various zones
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "aliexpress_standard", serviceLevel: "economy", averageDays: 25, minDays: 15, maxDays: 40, sampleSize: 20000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "aliexpress_standard", serviceLevel: "standard", averageDays: 18, minDays: 12, maxDays: 28, sampleSize: 15000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "aliexpress_standard", serviceLevel: "express", averageDays: 12, minDays: 8, maxDays: 18, sampleSize: 8000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "europe_west", carrierId: "aliexpress_standard", serviceLevel: "economy", averageDays: 28, minDays: 18, maxDays: 42, sampleSize: 12000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "europe_west", carrierId: "aliexpress_standard", serviceLevel: "standard", averageDays: 20, minDays: 14, maxDays: 30, sampleSize: 10000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "oceania", carrierId: "aliexpress_standard", serviceLevel: "standard", averageDays: 15, minDays: 10, maxDays: 22, sampleSize: 5000, lastUpdated: "2026-01-15" },

  // ePacket - China to various zones
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "epacket", serviceLevel: "economy", averageDays: 15, minDays: 10, maxDays: 22, sampleSize: 18000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "epacket", serviceLevel: "standard", averageDays: 11, minDays: 7, maxDays: 16, sampleSize: 14000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "epacket", serviceLevel: "express", averageDays: 8, minDays: 5, maxDays: 12, sampleSize: 6000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "europe_west", carrierId: "epacket", serviceLevel: "economy", averageDays: 18, minDays: 12, maxDays: 25, sampleSize: 8000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "europe_west", carrierId: "epacket", serviceLevel: "standard", averageDays: 13, minDays: 9, maxDays: 18, sampleSize: 6000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "oceania", carrierId: "epacket", serviceLevel: "standard", averageDays: 10, minDays: 7, maxDays: 14, sampleSize: 4000, lastUpdated: "2026-01-15" },

  // DHL Express - Global
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "dhl", serviceLevel: "economy", averageDays: 7, minDays: 5, maxDays: 10, sampleSize: 5000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "dhl", serviceLevel: "standard", averageDays: 5, minDays: 3, maxDays: 7, sampleSize: 8000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "dhl", serviceLevel: "express", averageDays: 3, minDays: 2, maxDays: 5, sampleSize: 6000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "dhl", serviceLevel: "priority", averageDays: 2, minDays: 1, maxDays: 3, sampleSize: 3000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "europe_west", carrierId: "dhl", serviceLevel: "standard", averageDays: 4, minDays: 3, maxDays: 6, sampleSize: 7000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "europe_west", carrierId: "dhl", serviceLevel: "express", averageDays: 3, minDays: 2, maxDays: 4, sampleSize: 5000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "oceania", carrierId: "dhl", serviceLevel: "standard", averageDays: 5, minDays: 3, maxDays: 7, sampleSize: 3000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "south_america", carrierId: "dhl", serviceLevel: "standard", averageDays: 7, minDays: 5, maxDays: 10, sampleSize: 2000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "middle_east", carrierId: "dhl", serviceLevel: "standard", averageDays: 4, minDays: 3, maxDays: 6, sampleSize: 3000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "africa", carrierId: "dhl", serviceLevel: "standard", averageDays: 6, minDays: 4, maxDays: 9, sampleSize: 1500, lastUpdated: "2026-01-15" },

  // FedEx - Global
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "fedex", serviceLevel: "economy", averageDays: 7, minDays: 5, maxDays: 10, sampleSize: 4000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "fedex", serviceLevel: "standard", averageDays: 5, minDays: 3, maxDays: 7, sampleSize: 6000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "fedex", serviceLevel: "express", averageDays: 3, minDays: 2, maxDays: 4, sampleSize: 5000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "north_america", carrierId: "fedex", serviceLevel: "priority", averageDays: 2, minDays: 1, maxDays: 3, sampleSize: 2500, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "europe_west", carrierId: "fedex", serviceLevel: "standard", averageDays: 4, minDays: 3, maxDays: 6, sampleSize: 5000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "europe_west", carrierId: "fedex", serviceLevel: "express", averageDays: 3, minDays: 2, maxDays: 4, sampleSize: 4000, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "oceania", carrierId: "fedex", serviceLevel: "standard", averageDays: 5, minDays: 3, maxDays: 7, sampleSize: 2500, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "south_america", carrierId: "fedex", serviceLevel: "standard", averageDays: 7, minDays: 5, maxDays: 10, sampleSize: 1500, lastUpdated: "2026-01-15" },
  { originZone: "asia_east", destinationZone: "middle_east", carrierId: "fedex", serviceLevel: "standard", averageDays: 4, minDays: 3, maxDays: 6, sampleSize: 2000, lastUpdated: "2026-01-15" },
];

// ── Holiday Delay Data ────────────────────────────────────────────────────────

interface HolidayPeriod {
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  delayDays: number;
  regions: string[];
}

const HOLIDAY_PERIODS: HolidayPeriod[] = [
  { name: "Chinese New Year", startMonth: 1, startDay: 20, endMonth: 2, endDay: 15, delayDays: 7, regions: ["asia_east", "asia_southeast"] },
  { name: "Golden Week (China)", startMonth: 10, startDay: 1, endMonth: 10, endDay: 7, delayDays: 5, regions: ["asia_east"] },
  { name: "Christmas Season", startMonth: 11, startDay: 25, endMonth: 1, endDay: 5, delayDays: 3, regions: ["north_america", "europe_west", "europe_north", "europe_east", "europe_south"] },
  { name: "Black Friday / Cyber Monday", startMonth: 11, startDay: 20, endMonth: 12, endDay: 5, delayDays: 2, regions: ["north_america", "europe_west"] },
  { name: "Ramadan", startMonth: 3, startDay: 1, endMonth: 4, endDay: 15, delayDays: 3, regions: ["middle_east", "africa"] },
  { name: "Diwali", startMonth: 10, startDay: 15, endMonth: 11, endDay: 15, delayDays: 2, regions: ["asia_south"] },
  { name: "Singles Day (11.11)", startMonth: 11, startDay: 5, endMonth: 11, endDay: 20, delayDays: 3, regions: ["asia_east"] },
];

// ── Weather Risk Assessment ───────────────────────────────────────────────────

const WEATHER_RISK_ZONES: Record<string, { season: string; riskLevel: number }[]> = {
  north_america: [
    { season: "winter", riskLevel: 0.3 },
    { season: "summer", riskLevel: 0.1 },
    { season: "spring", riskLevel: 0.15 },
    { season: "fall", riskLevel: 0.1 },
  ],
  europe_west: [
    { season: "winter", riskLevel: 0.25 },
    { season: "summer", riskLevel: 0.1 },
    { season: "spring", riskLevel: 0.15 },
    { season: "fall", riskLevel: 0.2 },
  ],
  asia_east: [
    { season: "winter", riskLevel: 0.2 },
    { season: "summer", riskLevel: 0.25 },
    { season: "spring", riskLevel: 0.3 },
    { season: "fall", riskLevel: 0.1 },
  ],
  oceania: [
    { season: "winter", riskLevel: 0.15 },
    { season: "summer", riskLevel: 0.1 },
    { season: "spring", riskLevel: 0.1 },
    { season: "fall", riskLevel: 0.15 },
  ],
  south_america: [
    { season: "winter", riskLevel: 0.15 },
    { season: "summer", riskLevel: 0.2 },
    { season: "spring", riskLevel: 0.2 },
    { season: "fall", riskLevel: 0.15 },
  ],
};

// ── Prediction Engine ─────────────────────────────────────────────────────────

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

function getDeliveryData(
  originCountry: string,
  destinationCountry: string,
  carrierId: CarrierId,
  serviceLevel: string
): ZoneDeliveryData | null {
  const originZone = SHIPPING_ZONES[originCountry.toUpperCase()] || "asia_east";
  const destZone = SHIPPING_ZONES[destinationCountry.toUpperCase()] || "north_america";

  const found = ZONE_DELIVERY_DATA.find(
    (d) =>
      d.originZone === originZone &&
      d.destinationZone === destZone &&
      d.carrierId === carrierId &&
      d.serviceLevel === serviceLevel
  );

  return found || null;
}

function assessHolidayRisk(originZone: string, destZone: string, shipDate: Date): DeliveryRiskFactor | null {
  for (const holiday of HOLIDAY_PERIODS) {
    const month = shipDate.getMonth() + 1;
    const day = shipDate.getDate();

    const isInRange = holiday.startMonth === holiday.endMonth
      ? month === holiday.startMonth && day >= holiday.startDay && day <= holiday.endDay
      : (month === holiday.startMonth && day >= holiday.startDay) || (month === holiday.endMonth && day <= holiday.endDay);

    if (isInRange && (holiday.regions.includes(originZone) || holiday.regions.includes(destZone))) {
      return {
        type: "holiday",
        severity: holiday.delayDays >= 5 ? "high" : holiday.delayDays >= 3 ? "medium" : "low",
        description: `${holiday.name} may cause ${holiday.delayDays}-day delays`,
        estimatedDelayDays: holiday.delayDays,
      };
    }
  }
  return null;
}

function assessWeatherRisk(destinationZone: string, shipDate: Date): DeliveryRiskFactor | null {
  const season = getSeason(shipDate.getMonth() + 1);
  const zoneWeather = WEATHER_RISK_ZONES[destinationZone];
  if (!zoneWeather) return null;

  const seasonData = zoneWeather.find((z) => z.season === season);
  if (!seasonData) return null;

  if (seasonData.riskLevel >= 0.25) {
    return {
      type: "weather",
      severity: seasonData.riskLevel >= 0.3 ? "medium" : "low",
      description: `${season} weather in ${destinationZone} may cause delays`,
      estimatedDelayDays: Math.round(seasonData.riskLevel * 5),
    };
  }
  return null;
}

function assessCustomsRisk(originCountry: string, destinationCountry: string): DeliveryRiskFactor | null {
  if (originCountry === destinationCountry) return null;

  const destData = getCountryData(destinationCountry);
  const clearanceDays = destData.averageClearanceDays;

  if (clearanceDays >= 3) {
    return {
      type: "customs",
      severity: clearanceDays >= 5 ? "high" : clearanceDays >= 3 ? "medium" : "low",
      description: `${destData.countryName} customs clearance averages ${clearanceDays} days`,
      estimatedDelayDays: clearanceDays,
    };
  }
  return null;
}

function calculateConfidence(
  data: ZoneDeliveryData | null,
  riskFactors: DeliveryRiskFactor[]
): number {
  let confidence = 0.7;

  if (data) {
    const sampleBonus = Math.min(data.sampleSize / 10000, 0.15);
    confidence += sampleBonus;
  }

  for (const risk of riskFactors) {
    const penalty = risk.severity === "high" ? 0.15 : risk.severity === "medium" ? 0.08 : 0.03;
    confidence -= penalty;
  }

  return Math.max(0.3, Math.min(0.98, confidence));
}

export function predictDelivery(request: DeliveryPredictionRequest): DeliveryPredictionResult {
  const carrierConfig = CARRIER_MAP[request.carrierId];
  const shipDate = request.shipDate ? new Date(request.shipDate) : new Date();

  const data = getDeliveryData(
    request.originCountry,
    request.destinationCountry,
    request.carrierId,
    request.serviceLevel
  );

  const originZone = SHIPPING_ZONES[request.originCountry.toUpperCase()] || "asia_east";
  const destZone = SHIPPING_ZONES[request.destinationCountry.toUpperCase()] || "north_america";

  const riskFactors: DeliveryRiskFactor[] = [];

  const holidayRisk = assessHolidayRisk(originZone, destZone, shipDate);
  if (holidayRisk) riskFactors.push(holidayRisk);

  const weatherRisk = assessWeatherRisk(destZone, shipDate);
  if (weatherRisk) riskFactors.push(weatherRisk);

  const customsRisk = assessCustomsRisk(request.originCountry, request.destinationCountry);
  if (customsRisk) riskFactors.push(customsRisk);

  if (request.weightKg > 10) {
    riskFactors.push({
      type: "carrier_delay",
      severity: "low",
      description: "Heavy packages may require additional handling time",
      estimatedDelayDays: 1,
    });
  }

  const isPeakSeason = (shipDate.getMonth() >= 10 && shipDate.getMonth() <= 11);
  if (isPeakSeason) {
    riskFactors.push({
      type: "peak_season",
      severity: "medium",
      description: "Holiday peak season shipping volumes may cause delays",
      estimatedDelayDays: 2,
    });
  }

  let predictedDays = data
    ? { min: data.minDays, max: data.maxDays, average: data.averageDays }
    : getDefaultDays(request.carrierId, request.serviceLevel);

  let totalDelay = 0;
  for (const risk of riskFactors) {
    totalDelay += risk.estimatedDelayDays;
  }

  predictedDays = {
    min: predictedDays.min,
    max: predictedDays.max + totalDelay,
    average: predictedDays.average + Math.round(totalDelay * 0.7),
  };

  const confidence = calculateConfidence(data, riskFactors);

  const arrivalBase = new Date(shipDate);
  arrivalBase.setDate(arrivalBase.getDate() + predictedDays.average);

  const earliest = new Date(shipDate);
  earliest.setDate(earliest.getDate() + predictedDays.min);

  const latest = new Date(shipDate);
  latest.setDate(latest.getDate() + predictedDays.max);

  return {
    carrierId: request.carrierId,
    carrierName: carrierConfig?.displayName || "Unknown",
    originCountry: request.originCountry,
    destinationCountry: request.destinationCountry,
    serviceLevel: request.serviceLevel,
    predictedDays,
    confidence,
    riskFactors,
    shipByDate: shipDate.toISOString().split("T")[0],
    estimatedArrival: {
      earliest: earliest.toISOString().split("T")[0],
      latest: latest.toISOString().split("T")[0],
      average: arrivalBase.toISOString().split("T")[0],
    },
    historicalAccuracy: data ? Math.min(0.95, 0.75 + (data.sampleSize / 50000) * 0.2) : 0.7,
    weatherDelayRisk: riskFactors.filter((r) => r.type === "weather").reduce((sum, r) => sum + r.estimatedDelayDays, 0),
    customsDelayRisk: riskFactors.filter((r) => r.type === "customs").reduce((sum, r) => sum + r.estimatedDelayDays, 0),
    holidayDelayRisk: riskFactors.filter((r) => r.type === "holiday").reduce((sum, r) => sum + r.estimatedDelayDays, 0),
  };
}

function getDefaultDays(carrierId: CarrierId, serviceLevel: string): { min: number; max: number; average: number } {
  const defaults: Record<CarrierId, Record<string, { min: number; max: number; average: number }>> = {
    cj: { economy: { min: 15, max: 25, average: 18 }, standard: { min: 10, max: 18, average: 14 }, express: { min: 7, max: 12, average: 9 }, priority: { min: 5, max: 8, average: 6 } },
    aliexpress_standard: { economy: { min: 18, max: 35, average: 25 }, standard: { min: 12, max: 25, average: 18 }, express: { min: 8, max: 15, average: 12 } },
    epacket: { economy: { min: 12, max: 20, average: 15 }, standard: { min: 8, max: 15, average: 11 }, express: { min: 5, max: 10, average: 8 } },
    dhl: { economy: { min: 5, max: 10, average: 7 }, standard: { min: 3, max: 7, average: 5 }, express: { min: 2, max: 5, average: 3 }, priority: { min: 1, max: 3, average: 2 } },
    fedex: { economy: { min: 5, max: 10, average: 7 }, standard: { min: 3, max: 7, average: 5 }, express: { min: 2, max: 4, average: 3 }, priority: { min: 1, max: 3, average: 2 } },
  };

  return defaults[carrierId]?.[serviceLevel] || { min: 10, max: 20, average: 15 };
}

export function predictDeliveryForAllCarriers(
  originCountry: string,
  destinationCountry: string,
  weightKg: number,
  shipDate?: string
): DeliveryPredictionResult[] {
  const carriers: { carrierId: CarrierId; serviceLevel: "economy" | "standard" | "express" | "priority" }[] = [
    { carrierId: "cj", serviceLevel: "economy" },
    { carrierId: "cj", serviceLevel: "standard" },
    { carrierId: "cj", serviceLevel: "express" },
    { carrierId: "aliexpress_standard", serviceLevel: "economy" },
    { carrierId: "aliexpress_standard", serviceLevel: "standard" },
    { carrierId: "aliexpress_standard", serviceLevel: "express" },
    { carrierId: "epacket", serviceLevel: "economy" },
    { carrierId: "epacket", serviceLevel: "standard" },
    { carrierId: "epacket", serviceLevel: "express" },
    { carrierId: "dhl", serviceLevel: "economy" },
    { carrierId: "dhl", serviceLevel: "standard" },
    { carrierId: "dhl", serviceLevel: "express" },
    { carrierId: "dhl", serviceLevel: "priority" },
    { carrierId: "fedex", serviceLevel: "economy" },
    { carrierId: "fedex", serviceLevel: "standard" },
    { carrierId: "fedex", serviceLevel: "express" },
    { carrierId: "fedex", serviceLevel: "priority" },
  ];

  return carriers.map((c) =>
    predictDelivery({
      carrierId: c.carrierId,
      originCountry,
      destinationCountry,
      weightKg,
      serviceLevel: c.serviceLevel,
      shipDate,
    })
  );
}

import { getAdminDB } from "@/lib/firebase-admin";

// ── Shipping Rate Cache ───────────────────────────────────────────────────────

export interface CachedShippingRate {
  cacheKey: string;
  originCountry: string;
  destinationCountry: string;
  weightKg: number;
  rates: Array<{
    carrierId: string;
    serviceLevel: string;
    cost: number;
    estimatedDaysMin: number;
    estimatedDaysMax: number;
  }>;
  createdAt: string;
  expiresAt: string;
}

export interface ShippingPreferencesDoc {
  userId: string;
  defaultOptimization: string;
  defaultMaxBudget: number;
  defaultMaxDeliveryDays: number;
  preferredCarriers: string[];
  excludedCarriers: string[];
  requireTracking: boolean;
  requireInsurance: boolean;
  autoSelectEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomsEstimateDoc {
  userId: string;
  originCountry: string;
  destinationCountry: string;
  totalDeclaredValue: number;
  totalTaxes: number;
  currency: string;
  itemCount: number;
  calculatedAt: string;
}

// ── Rate Cache Operations ─────────────────────────────────────────────────────

export function buildRateCacheKey(
  originCountry: string,
  destinationCountry: string,
  weightKg: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number
): string {
  return `${originCountry}_${destinationCountry}_${weightKg.toFixed(2)}_${lengthCm}_${widthCm}_${heightCm}`;
}

export async function getCachedRates(cacheKey: string): Promise<CachedShippingRate | null> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("shippingRateCache").doc(cacheKey).get();
    if (!snap.exists) return null;

    const data = snap.data();
    if (!data) return null;

    if (new Date(data.expiresAt) < new Date()) {
      await db.collection("shippingRateCache").doc(cacheKey).delete();
      return null;
    }

    return { id: snap.id, ...data } as unknown as CachedShippingRate;
  } catch {
    return null;
  }
}

export async function setCachedRates(cache: CachedShippingRate): Promise<void> {
  try {
    const db = await getAdminDB();
    await db.collection("shippingRateCache").doc(cache.cacheKey).set({
      originCountry: cache.originCountry,
      destinationCountry: cache.destinationCountry,
      weightKg: cache.weightKg,
      rates: cache.rates,
      createdAt: cache.createdAt,
      expiresAt: cache.expiresAt,
    });
  } catch {
    // Silent fail for cache writes
  }
}

export async function clearExpiredCache(): Promise<number> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("shippingRateCache")
      .where("expiresAt", "<", new Date().toISOString())
      .limit(100)
      .get();

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    return snap.docs.length;
  } catch {
    return 0;
  }
}

// ── Shipping Preferences Operations ───────────────────────────────────────────

export async function getShippingPreferences(userId: string): Promise<ShippingPreferencesDoc | null> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(userId).collection("shippingPreferences").doc("default").get();
    if (!snap.exists) return null;
    return snap.data() as ShippingPreferencesDoc;
  } catch {
    return null;
  }
}

export async function saveShippingPreferences(userId: string, prefs: Omit<ShippingPreferencesDoc, "userId" | "createdAt" | "updatedAt">): Promise<void> {
  const db = await getAdminDB();
  const now = new Date().toISOString();
  const existing = await getShippingPreferences(userId);

  await db.collection("users").doc(userId).collection("shippingPreferences").doc("default").set({
    userId,
    ...prefs,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });
}

// ── Customs Estimate History ──────────────────────────────────────────────────

export async function saveCustomsEstimate(userId: string, estimate: Omit<CustomsEstimateDoc, "userId" | "calculatedAt">): Promise<void> {
  const db = await getAdminDB();
  await db.collection("users").doc(userId).collection("customsEstimates").add({
    ...estimate,
    userId,
    calculatedAt: new Date().toISOString(),
  });
}

export async function getCustomsEstimateHistory(userId: string, limit: number = 20): Promise<CustomsEstimateDoc[]> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(userId).collection("customsEstimates")
      .orderBy("calculatedAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as CustomsEstimateDoc));
  } catch {
    return [];
  }
}

// ── Rate Comparison History ───────────────────────────────────────────────────

export interface RateComparisonHistory {
  id?: string;
  userId: string;
  originCountry: string;
  destinationCountry: string;
  weightKg: number;
  selectedCarrier: string;
  selectedCost: number;
  cheapestCost: number;
  savings: number;
  comparedAt: string;
}

export async function saveRateComparison(userId: string, comparison: Omit<RateComparisonHistory, "userId" | "comparedAt">): Promise<void> {
  const db = await getAdminDB();
  await db.collection("users").doc(userId).collection("rateComparisons").add({
    ...comparison,
    userId,
    comparedAt: new Date().toISOString(),
  });
}

export async function getRateComparisonHistory(userId: string, limit: number = 20): Promise<RateComparisonHistory[]> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(userId).collection("rateComparisons")
      .orderBy("comparedAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as RateComparisonHistory));
  } catch {
    return [];
  }
}

export async function getShippingAnalytics(userId: string): Promise<{
  totalComparisons: number;
  totalCustomsCalculations: number;
  avgSavings: number;
  topCarrier: string;
  recentActivity: Array<{ type: string; date: string; details: string }>;
}> {
  try {
    const db = await getAdminDB();

    const [comparisonsSnap, customsSnap] = await Promise.all([
      db.collection("users").doc(userId).collection("rateComparisons").orderBy("comparedAt", "desc").limit(50).get(),
      db.collection("users").doc(userId).collection("customsEstimates").orderBy("calculatedAt", "desc").limit(50).get(),
    ]);

    const comparisons = comparisonsSnap.docs.map((d) => d.data());
    const customs = customsSnap.docs.map((d) => d.data());

    const totalComparisons = comparisons.length;
    const totalCustomsCalculations = customs.length;

    const avgSavings = comparisons.length > 0
      ? comparisons.reduce((sum, c) => sum + ((c.cheapestCost || 0) - (c.selectedCost || 0)), 0) / comparisons.length
      : 0;

    const carrierCounts: Record<string, number> = {};
    for (const c of comparisons) {
      const carrier = c.selectedCarrier || "unknown";
      carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
    }
    const topCarrier = Object.entries(carrierCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A";

    const recentActivity: Array<{ type: string; date: string; details: string }> = [];
    for (const c of comparisons.slice(0, 5)) {
      recentActivity.push({
        type: "rate_comparison",
        date: c.comparedAt,
        details: `${c.originCountry}→${c.destinationCountry} via ${c.selectedCarrier}`,
      });
    }
    for (const c of customs.slice(0, 5)) {
      recentActivity.push({
        type: "customs_calculation",
        date: c.calculatedAt,
        details: `${c.originCountry}→${c.destinationCountry} $${c.totalDeclaredValue?.toFixed(2) || "0"}`,
      });
    }
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      totalComparisons,
      totalCustomsCalculations,
      avgSavings: +avgSavings.toFixed(2),
      topCarrier,
      recentActivity: recentActivity.slice(0, 10),
    };
  } catch {
    return {
      totalComparisons: 0,
      totalCustomsCalculations: 0,
      avgSavings: 0,
      topCarrier: "N/A",
      recentActivity: [],
    };
  }
}

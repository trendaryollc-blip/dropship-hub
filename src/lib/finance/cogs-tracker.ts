export interface COGSEntry {
  id: string;
  productId: string;
  productTitle: string;
  supplierId: string;
  supplierName: string;
  unitCost: number;
  shippingCost: number;
  packagingCost: number;
  otherCosts: number;
  totalCOGS: number;
  effectiveDate: string;
  expiryDate?: string;
  isActive: boolean;
  priceHistory: PriceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistoryEntry {
  date: string;
  unitCost: number;
  shippingCost: number;
  totalCOGS: number;
  changeReason?: string;
}

export interface COGSSummary {
  totalProducts: number;
  avgUnitCost: number;
  avgShippingCost: number;
  avgTotalCOGS: number;
  totalInventoryValue: number;
  costTrend: "increasing" | "decreasing" | "stable";
  costTrendPercentage: number;
  topExpensiveProducts: COGSEntry[];
  recentChanges: COGSEntry[];
}

export interface CostAlert {
  id: string;
  type: "price_increase" | "price_decrease" | "supplier_change" | "bulk_update";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  productId: string;
  oldCost: number;
  newCost: number;
  changePercentage: number;
  createdAt: string;
}

const cogsEntries: Map<string, COGSEntry> = new Map();
const costAlerts: CostAlert[] = [];

export function addCOGSEntry(input: Omit<COGSEntry, "id" | "totalCOGS" | "priceHistory" | "createdAt" | "updatedAt">): COGSEntry {
  const id = `cogs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const totalCOGS = input.unitCost + input.shippingCost + input.packagingCost + input.otherCosts;

  const existingEntry = Array.from(cogsEntries.values()).find(
    (e) => e.productId === input.productId && e.supplierId === input.supplierId && e.isActive
  );

  const priceHistory: PriceHistoryEntry[] = [];
  if (existingEntry) {
    priceHistory.push(...existingEntry.priceHistory);
    if (existingEntry.unitCost !== input.unitCost || existingEntry.shippingCost !== input.shippingCost) {
      priceHistory.push({
        date: new Date().toISOString(),
        unitCost: input.unitCost,
        shippingCost: input.shippingCost,
        totalCOGS,
        changeReason: "Price update",
      });

      generateCostAlert(existingEntry, { ...input, totalCOGS });
    }
    existingEntry.isActive = false;
  } else {
    priceHistory.push({
      date: new Date().toISOString(),
      unitCost: input.unitCost,
      shippingCost: input.shippingCost,
      totalCOGS,
      changeReason: "Initial entry",
    });
  }

  const entry: COGSEntry = {
    ...input,
    id,
    totalCOGS,
    priceHistory,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  cogsEntries.set(id, entry);
  return entry;
}

export function getCOGSEntry(id: string): COGSEntry | null {
  return cogsEntries.get(id) || null;
}

export function getCOGSByProduct(productId: string): COGSEntry | null {
  return Array.from(cogsEntries.values()).find(
    (e) => e.productId === productId && e.isActive
  ) || null;
}

export function getAllCOGSEntries(limit: number = 100): COGSEntry[] {
  return Array.from(cogsEntries.values())
    .filter((e) => e.isActive)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

export function updateCOGSEntry(id: string, updates: Partial<COGSEntry>): COGSEntry | null {
  const existing = cogsEntries.get(id);
  if (!existing) return null;

  const updatedEntry: COGSEntry = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    totalCOGS: (updates.unitCost ?? existing.unitCost) + (updates.shippingCost ?? existing.shippingCost) + (updates.packagingCost ?? existing.packagingCost) + (updates.otherCosts ?? existing.otherCosts),
  };

  if (updates.unitCost !== undefined || updates.shippingCost !== undefined) {
    updatedEntry.priceHistory = [
      ...existing.priceHistory,
      {
        date: new Date().toISOString(),
        unitCost: updatedEntry.unitCost,
        shippingCost: updatedEntry.shippingCost,
        totalCOGS: updatedEntry.totalCOGS,
        changeReason: updates.priceHistory?.[updates.priceHistory.length - 1]?.changeReason || "Manual update",
      },
    ];

    generateCostAlert(existing, updatedEntry);
  }

  cogsEntries.set(id, updatedEntry);
  return updatedEntry;
}

export function deleteCOGSEntry(id: string): boolean {
  const entry = cogsEntries.get(id);
  if (!entry) return false;

  entry.isActive = false;
  entry.updatedAt = new Date().toISOString();
  cogsEntries.set(id, entry);
  return true;
}

export function calculateCOGSForOrder(productId: string, quantity: number): {
  unitCost: number;
  shippingCost: number;
  packagingCost: number;
  otherCosts: number;
  totalCOGS: number;
} {
  const entry = getCOGSByProduct(productId);
  if (!entry) {
    return { unitCost: 0, shippingCost: 0, packagingCost: 0, otherCosts: 0, totalCOGS: 0 };
  }

  return {
    unitCost: entry.unitCost * quantity,
    shippingCost: entry.shippingCost * quantity,
    packagingCost: entry.packagingCost * quantity,
    otherCosts: entry.otherCosts * quantity,
    totalCOGS: entry.totalCOGS * quantity,
  };
}

export function getCOGSSummary(): COGSSummary {
  const activeEntries = getAllCOGSEntries();

  if (activeEntries.length === 0) {
    return {
      totalProducts: 0,
      avgUnitCost: 0,
      avgShippingCost: 0,
      avgTotalCOGS: 0,
      totalInventoryValue: 0,
      costTrend: "stable",
      costTrendPercentage: 0,
      topExpensiveProducts: [],
      recentChanges: [],
    };
  }

  const totalUnitCost = activeEntries.reduce((sum, e) => sum + e.unitCost, 0);
  const totalShippingCost = activeEntries.reduce((sum, e) => sum + e.shippingCost, 0);
  const totalCOGS = activeEntries.reduce((sum, e) => sum + e.totalCOGS, 0);

  const avgUnitCost = +(totalUnitCost / activeEntries.length).toFixed(2);
  const avgShippingCost = +(totalShippingCost / activeEntries.length).toFixed(2);
  const avgTotalCOGS = +(totalCOGS / activeEntries.length).toFixed(2);

  const costTrend = calculateCostTrend(activeEntries);

  const topExpensiveProducts = [...activeEntries]
    .sort((a, b) => b.totalCOGS - a.totalCOGS)
    .slice(0, 5);

  const recentChanges = [...activeEntries]
    .filter((e) => e.priceHistory.length > 1)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  return {
    totalProducts: activeEntries.length,
    avgUnitCost,
    avgShippingCost,
    avgTotalCOGS,
    totalInventoryValue: +totalCOGS.toFixed(2),
    costTrend: costTrend.direction,
    costTrendPercentage: costTrend.percentage,
    topExpensiveProducts,
    recentChanges,
  };
}

function calculateCostTrend(entries: COGSEntry[]): { direction: "increasing" | "decreasing" | "stable"; percentage: number } {
  if (entries.length < 2) return { direction: "stable", percentage: 0 };

  let increasing = 0;
  let decreasing = 0;
  let stable = 0;

  for (const entry of entries) {
    if (entry.priceHistory.length < 2) continue;

    const latest = entry.priceHistory[entry.priceHistory.length - 1];
    const previous = entry.priceHistory[entry.priceHistory.length - 2];

    if (latest.totalCOGS > previous.totalCOGS) increasing++;
    else if (latest.totalCOGS < previous.totalCOGS) decreasing++;
    else stable++;
  }

  const total = increasing + decreasing + stable;
  if (total === 0) return { direction: "stable", percentage: 0 };

  if (increasing > decreasing && increasing > stable) {
    return { direction: "increasing", percentage: +((increasing / total) * 100).toFixed(1) };
  } else if (decreasing > increasing && decreasing > stable) {
    return { direction: "decreasing", percentage: +((decreasing / total) * 100).toFixed(1) };
  }

  return { direction: "stable", percentage: 0 };
}

function generateCostAlert(oldEntry: COGSEntry, newEntry: Pick<COGSEntry, "totalCOGS" | "productId" | "productTitle" | "unitCost" | "shippingCost" | "packagingCost" | "otherCosts">): void {
  const oldCost = oldEntry.totalCOGS;
  const newCost = newEntry.unitCost + newEntry.shippingCost + newEntry.packagingCost + newEntry.otherCosts;
  const changePercentage = oldCost > 0 ? +(((newCost - oldCost) / oldCost) * 100).toFixed(1) : 0;

  if (Math.abs(changePercentage) < 1) return;

  const alert: CostAlert = {
    id: `cost_alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: changePercentage > 0 ? "price_increase" : "price_decrease",
    title: `Cost ${changePercentage > 0 ? "Increase" : "Decrease"}: ${newEntry.productTitle}`,
    message: `Cost changed from $${oldCost.toFixed(2)} to $${newCost.toFixed(2)} (${changePercentage > 0 ? "+" : ""}${changePercentage}%)`,
    severity: Math.abs(changePercentage) > 20 ? "critical" : Math.abs(changePercentage) > 10 ? "warning" : "info",
    productId: newEntry.productId,
    oldCost,
    newCost,
    changePercentage,
    createdAt: new Date().toISOString(),
  };

  costAlerts.push(alert);
}

export function getCostAlerts(limit: number = 20): CostAlert[] {
  return costAlerts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function bulkUpdateCOGS(entries: Array<{ productId: string; unitCost?: number; shippingCost?: number; packagingCost?: number; otherCosts?: number }>): {
  updated: number;
  failed: number;
  errors: string[];
} {
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const input of entries) {
    try {
      const existing = getCOGSByProduct(input.productId);
      if (!existing) {
        errors.push(`Product ${input.productId} not found`);
        failed++;
        continue;
      }

      const result = updateCOGSEntry(existing.id, {
        unitCost: input.unitCost ?? existing.unitCost,
        shippingCost: input.shippingCost ?? existing.shippingCost,
        packagingCost: input.packagingCost ?? existing.packagingCost,
        otherCosts: input.otherCosts ?? existing.otherCosts,
      });

      if (result) {
        updated++;
      } else {
        errors.push(`Failed to update product ${input.productId}`);
        failed++;
      }
    } catch (err) {
      errors.push(`Error updating product ${input.productId}: ${err instanceof Error ? err.message : "Unknown error"}`);
      failed++;
    }
  }

  return { updated, failed, errors };
}

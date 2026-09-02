export interface CashFlowEntry {
  id: string;
  type: "inflow" | "outflow";
  category: "sales" | "refunds" | "cogs" | "shipping" | "platform_fees" | "ad_spend" | "other";
  description: string;
  amount: number;
  date: string;
  status: "pending" | "completed" | "scheduled";
  relatedOrderId?: string;
  paymentTerms?: PaymentTerms;
  createdAt: string;
}

export interface PaymentTerms {
  type: "net_0" | "net_15" | "net_30" | "net_60" | "custom";
  days: number;
  dueDate: string;
}

export interface CashFlowProjection {
  id: string;
  period: {
    startDate: string;
    endDate: string;
  };
  dailyProjections: DailyCashFlow[];
  summary: {
    totalInflows: number;
    totalOutflows: number;
    netCashFlow: number;
    endingBalance: number;
    projectedBalance: number;
    daysWithNegativeBalance: number;
  };
  alerts: CashFlowAlert[];
  generatedAt: string;
}

export interface DailyCashFlow {
  date: string;
  inflows: number;
  outflows: number;
  netFlow: number;
  runningBalance: number;
  projectedBalance: number;
  pendingInflows: number;
  pendingOutflows: number;
}

export interface CashFlowAlert {
  id: string;
  type: "low_balance" | "large_outflow" | "payment_due" | "cash_shortage";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  date: string;
  amount: number;
  createdAt: string;
}

export interface CashFlowForecastInput {
  startDate: string;
  endDate: string;
  startingBalance: number;
  entries: CashFlowEntry[];
  historicalPattern?: {
    avgDailySales: number;
    avgDailyCosts: number;
    seasonalityFactor?: number;
  };
}

const cashFlowEntries: Map<string, CashFlowEntry> = new Map();
const cashFlowAlerts: CashFlowAlert[] = [];

export function addCashFlowEntry(input: Omit<CashFlowEntry, "id" | "createdAt">): CashFlowEntry {
  const id = `cf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: CashFlowEntry = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
  };

  cashFlowEntries.set(id, entry);
  return entry;
}

export function getCashFlowEntry(id: string): CashFlowEntry | null {
  return cashFlowEntries.get(id) || null;
}

export function getAllCashFlowEntries(limit: number = 100): CashFlowEntry[] {
  return Array.from(cashFlowEntries.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export function getCashFlowEntriesByDateRange(startDate: string, endDate: string): CashFlowEntry[] {
  return Array.from(cashFlowEntries.values())
    .filter((e) => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function updateCashFlowEntry(id: string, updates: Partial<CashFlowEntry>): CashFlowEntry | null {
  const existing = cashFlowEntries.get(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates, id: existing.id, createdAt: existing.createdAt };
  cashFlowEntries.set(id, updated);
  return updated;
}

export function deleteCashFlowEntry(id: string): boolean {
  return cashFlowEntries.delete(id);
}

export function generateCashFlowProjection(input: CashFlowForecastInput): CashFlowProjection {
  const { startDate, endDate, startingBalance, entries, historicalPattern } = input;

  const dailyMap = new Map<string, DailyCashFlow>();
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    dailyMap.set(dateStr, {
      date: dateStr,
      inflows: 0,
      outflows: 0,
      netFlow: 0,
      runningBalance: 0,
      projectedBalance: 0,
      pendingInflows: 0,
      pendingOutflows: 0,
    });
  }

  for (const entry of entries) {
    const day = dailyMap.get(entry.date);
    if (!day) continue;

    if (entry.type === "inflow") {
      day.inflows += entry.amount;
      if (entry.status === "pending") {
        day.pendingInflows += entry.amount;
      }
    } else {
      day.outflows += entry.amount;
      if (entry.status === "pending") {
        day.pendingOutflows += entry.amount;
      }
    }
  }

  let runningBalance = startingBalance;
  const sortedDays = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  for (const day of sortedDays) {
    day.netFlow = day.inflows - day.outflows;
    runningBalance += day.netFlow;
    day.runningBalance = runningBalance;
    day.projectedBalance = runningBalance;
  }

  if (historicalPattern) {
    const avgDailyNet = historicalPattern.avgDailySales - historicalPattern.avgDailyCosts;
    const seasonality = historicalPattern.seasonalityFactor || 1;

    for (const day of sortedDays) {
      if (day.inflows === 0 && day.outflows === 0) {
        const projectedNet = avgDailyNet * seasonality;
        day.projectedBalance = day.runningBalance + projectedNet;
      }
    }
  }

  const totalInflows = sortedDays.reduce((sum, d) => sum + d.inflows, 0);
  const totalOutflows = sortedDays.reduce((sum, d) => sum + d.outflows, 0);
  const netCashFlow = totalInflows - totalOutflows;
  const endingBalance = sortedDays[sortedDays.length - 1]?.runningBalance || startingBalance;
  const projectedBalance = sortedDays[sortedDays.length - 1]?.projectedBalance || startingBalance;
  const daysWithNegativeBalance = sortedDays.filter((d) => d.runningBalance < 0).length;

  const alerts = generateCashFlowAlerts(sortedDays, startingBalance);

  const projection: CashFlowProjection = {
    id: `projection_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    period: { startDate, endDate },
    dailyProjections: sortedDays,
    summary: {
      totalInflows: +totalInflows.toFixed(2),
      totalOutflows: +totalOutflows.toFixed(2),
      netCashFlow: +netCashFlow.toFixed(2),
      endingBalance: +endingBalance.toFixed(2),
      projectedBalance: +projectedBalance.toFixed(2),
      daysWithNegativeBalance,
    },
    alerts,
    generatedAt: new Date().toISOString(),
  };

  return projection;
}

function generateCashFlowAlerts(dailyProjections: DailyCashFlow[], startingBalance: number): CashFlowAlert[] {
  const alerts: CashFlowAlert[] = [];
  const lowBalanceThreshold = startingBalance * 0.2;

  for (const day of dailyProjections) {
    if (day.runningBalance < 0) {
      alerts.push({
        id: `alert_${Date.now()}_negative_${day.date}`,
        type: "cash_shortage",
        title: "Negative Cash Balance",
        message: `Projected balance on ${day.date} is $${day.runningBalance.toFixed(2)}`,
        severity: "critical",
        date: day.date,
        amount: day.runningBalance,
        createdAt: new Date().toISOString(),
      });
    } else if (day.runningBalance < lowBalanceThreshold) {
      alerts.push({
        id: `alert_${Date.now()}_low_${day.date}`,
        type: "low_balance",
        title: "Low Cash Balance",
        message: `Projected balance on ${day.date} is $${day.runningBalance.toFixed(2)}, below $${lowBalanceThreshold.toFixed(2)} threshold`,
        severity: "warning",
        date: day.date,
        amount: day.runningBalance,
        createdAt: new Date().toISOString(),
      });
    }

    if (day.outflows > day.inflows * 2 && day.outflows > 0) {
      alerts.push({
        id: `alert_${Date.now()}_large_${day.date}`,
        type: "large_outflow",
        title: "Large Outflow Detected",
        message: `Outflow of $${day.outflows.toFixed(2)} on ${day.date} is significantly higher than inflows`,
        severity: "warning",
        date: day.date,
        amount: day.outflows,
        createdAt: new Date().toISOString(),
      });
    }

    if (day.pendingOutflows > 0) {
      alerts.push({
        id: `alert_${Date.now()}_pending_${day.date}`,
        type: "payment_due",
        title: "Pending Payments",
        message: `$${day.pendingOutflows.toFixed(2)} in pending payments due on ${day.date}`,
        severity: "info",
        date: day.date,
        amount: day.pendingOutflows,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

export function calculatePaymentTermsDueDate(orderDate: string, terms: PaymentTerms): string {
  const date = new Date(orderDate);
  date.setDate(date.getDate() + terms.days);
  return date.toISOString().split("T")[0];
}

export function getCashFlowSummary(startDate: string, endDate: string): {
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  avgDailyInflows: number;
  avgDailyOutflows: number;
  inflowsByCategory: Record<string, number>;
  outflowsByCategory: Record<string, number>;
} {
  const entries = getCashFlowEntriesByDateRange(startDate, endDate);

  let totalInflows = 0;
  let totalOutflows = 0;
  const inflowsByCategory: Record<string, number> = {};
  const outflowsByCategory: Record<string, number> = {};

  for (const entry of entries) {
    if (entry.type === "inflow") {
      totalInflows += entry.amount;
      inflowsByCategory[entry.category] = (inflowsByCategory[entry.category] || 0) + entry.amount;
    } else {
      totalOutflows += entry.amount;
      outflowsByCategory[entry.category] = (outflowsByCategory[entry.category] || 0) + entry.amount;
    }
  }

  const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));

  return {
    totalInflows: +totalInflows.toFixed(2),
    totalOutflows: +totalOutflows.toFixed(2),
    netCashFlow: +(totalInflows - totalOutflows).toFixed(2),
    avgDailyInflows: +(totalInflows / days).toFixed(2),
    avgDailyOutflows: +(totalOutflows / days).toFixed(2),
    inflowsByCategory,
    outflowsByCategory,
  };
}

export function getUpcomingPayments(days: number = 30): CashFlowEntry[] {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split("T")[0];
  const futureStr = futureDate.toISOString().split("T")[0];

  return Array.from(cashFlowEntries.values())
    .filter((e) => e.status === "pending" && e.date >= todayStr && e.date <= futureStr)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function validateCashFlowInput(input: CashFlowForecastInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.startDate) {
    errors.push("Start date is required");
  }
  if (!input.endDate) {
    errors.push("End date is required");
  }
  if (input.startDate && input.endDate && new Date(input.startDate) > new Date(input.endDate)) {
    errors.push("Start date must be before end date");
  }
  if (input.startingBalance === undefined || input.startingBalance === null) {
    errors.push("Starting balance is required");
  }

  return { valid: errors.length === 0, errors };
}

export function getCashFlowAlerts(limit: number = 20): CashFlowAlert[] {
  return cashFlowAlerts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

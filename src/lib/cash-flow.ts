import type { CashFlowForecast, CashFlowSnapshot } from "@/types/cash-flow";

export function calculateCashFlowForecast(params: {
  currentBalance: number;
  entries: { type: "inflow" | "outflow"; amount: number; expectedDate: string; status: string }[];
  days?: number;
}): CashFlowForecast[] {
  const { currentBalance, entries, days = 30 } = params;
  const forecast: CashFlowForecast[] = [];
  let runningBalance = currentBalance;

  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    const dayInflows = entries
      .filter((e) => e.type === "inflow" && e.expectedDate === dateStr && e.status !== "completed")
      .reduce((sum, e) => sum + e.amount, 0);

    const dayOutflows = entries
      .filter((e) => e.type === "outflow" && e.expectedDate === dateStr && e.status !== "completed")
      .reduce((sum, e) => sum + e.amount, 0);

    const net = dayInflows - dayOutflows;
    runningBalance += net;

    forecast.push({
      date: dateStr,
      inflows: dayInflows,
      outflows: dayOutflows,
      net,
      runningBalance,
    });
  }

  return forecast;
}

export function calculateCashFlowSnapshot(params: {
  currentBalance: number;
  pendingInflows: number;
  pendingOutflows: number;
  forecast: CashFlowForecast[];
}): Omit<CashFlowSnapshot, "id" | "createdAt"> {
  const { currentBalance, pendingInflows, pendingOutflows, forecast } = params;

  const netPending = pendingInflows - pendingOutflows;

  // Calculate burn rate (average daily net outflow over next 7 days)
  const next7 = forecast.slice(0, 7);
  const totalNet7 = next7.reduce((sum, f) => sum + f.net, 0);
  const burnRate = totalNet7 < 0 ? Math.abs(totalNet7 / 7) : 0;

  // Runway: how many days until balance hits 0
  const runwayDays = burnRate > 0 ? Math.floor(currentBalance / burnRate) : 999;

  // Monthly totals from forecast
  const next30 = forecast.slice(0, 30);
  const monthlyInflows = next30.reduce((sum, f) => sum + f.inflows, 0);
  const monthlyOutflows = next30.reduce((sum, f) => sum + f.outflows, 0);

  // Cash conversion cycle (simplified)
  const cashConversionCycle = 14; // Typical: you pay supplier, ship, customer pays you

  return {
    currentBalance,
    availableBalance: currentBalance + netPending,
    pendingInflows,
    pendingOutflows,
    netPending,
    runwayDays,
    burnRate: Math.round(burnRate * 100) / 100,
    monthlyInflows,
    monthlyOutflows,
    cashConversionCycle,
    forecast,
    calculatedAt: new Date().toISOString(),
  };
}

export function generateCashFlowAlerts(params: {
  balance: number;
  forecast: CashFlowForecast[];
  pendingPayments: { description: string; amount: number; dueDate: string; status: string }[];
}): { type: string; severity: string; title: string; description: string; amount?: number; dueDate?: string }[] {
  const alerts: { type: string; severity: string; title: string; description: string; amount?: number; dueDate?: string }[] = [];
  const { balance, forecast, pendingPayments } = params;

  // Low balance alert
  if (balance < 100) {
    alerts.push({
      type: "low_balance",
      severity: "critical",
      title: "Cash balance critically low",
      description: `Current balance: $${balance.toFixed(2)}. Add funds immediately.`,
      amount: balance,
    });
  } else if (balance < 500) {
    alerts.push({
      type: "low_balance",
      severity: "warning",
      title: "Cash balance running low",
      description: `Current balance: $${balance.toFixed(2)}. Monitor closely.`,
      amount: balance,
    });
  }

  // Negative forecast
  const day7 = forecast[6];
  if (day7 && day7.runningBalance < 0) {
    alerts.push({
      type: "negative_forecast",
      severity: "critical",
      title: "Projected negative balance in 7 days",
      description: `Balance expected to drop to $${day7.runningBalance.toFixed(2)} by ${day7.date}.`,
      amount: day7.runningBalance,
    });
  }

  // Large outflows
  const largeOutflows = forecast.filter((f) => f.outflows > 500);
  largeOutflows.forEach((f) => {
    alerts.push({
      type: "large_outflow",
      severity: "warning",
      title: `Large payment of $${f.outflows.toFixed(2)} due`,
      description: `Payment scheduled for ${f.date}.`,
      amount: f.outflows,
      dueDate: f.date,
    });
  });

  // Overdue payments
  const today = new Date().toISOString().split("T")[0];
  pendingPayments
    .filter((p) => p.status === "pending" && p.dueDate < today)
    .forEach((p) => {
      alerts.push({
        type: "overdue_payment",
        severity: "critical",
        title: `Overdue: ${p.description}`,
        description: `$${p.amount.toFixed(2)} was due on ${p.dueDate}.`,
        amount: p.amount,
        dueDate: p.dueDate,
      });
    });

  return alerts;
}

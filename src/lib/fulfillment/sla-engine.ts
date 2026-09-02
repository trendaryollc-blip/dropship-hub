import type { SLAConfig } from "@/types/automation";
import { DEFAULT_SLA_CONFIG } from "@/types/automation";
import type { FulfillmentOrder } from "@/types/fulfillment";

interface SLACheckResult {
  orderId: string;
  breaches: SLABreach[];
  overallStatus: "ok" | "warning" | "breached";
  nextDeadline: string | null;
}

interface SLABreach {
  type: "processing" | "fulfillment" | "shipping" | "delivery";
  severity: "warning" | "critical";
  message: string;
  deadline: string;
  elapsed: string;
  hoursOverdue: number;
}

export function checkSLA(
  order: FulfillmentOrder,
  config: SLAConfig = DEFAULT_SLA_CONFIG
): SLACheckResult {
  const breaches: SLABreach[] = [];
  const now = Date.now();
  const createdAt = new Date(order.createdAt).getTime();
  const updatedAt = new Date(order.updatedAt).getTime();

  const processingDeadline = createdAt + config.maxProcessingHours * 60 * 60 * 1000;
  const fulfillmentDeadline = createdAt + config.maxFulfillmentHours * 60 * 60 * 1000;

  if (order.status === "pending" && now > processingDeadline) {
    const hoursOverdue = (now - processingDeadline) / (60 * 60 * 1000);
    breaches.push({
      type: "processing",
      severity: hoursOverdue > 2 ? "critical" : "warning",
      message: `Order pending for ${hoursOverdue.toFixed(1)} hours beyond ${config.maxProcessingHours}h processing SLA`,
      deadline: new Date(processingDeadline).toISOString(),
      elapsed: formatDuration(now - createdAt),
      hoursOverdue,
    });
  }

  if (order.status === "in_progress" && now > fulfillmentDeadline) {
    const hoursOverdue = (now - fulfillmentDeadline) / (60 * 60 * 1000);
    breaches.push({
      type: "fulfillment",
      severity: hoursOverdue > 4 ? "critical" : "warning",
      message: `Order in progress for ${hoursOverdue.toFixed(1)} hours beyond ${config.maxFulfillmentHours}h fulfillment SLA`,
      deadline: new Date(fulfillmentDeadline).toISOString(),
      elapsed: formatDuration(now - createdAt),
      hoursOverdue,
    });
  }

  if (order.status === "shipped") {
    const shippedAt = updatedAt;
    const shippingDeadline = shippedAt + config.maxShippingDays * 24 * 60 * 60 * 1000;
    if (now > shippingDeadline) {
      const daysOverdue = (now - shippingDeadline) / (24 * 60 * 60 * 1000);
      breaches.push({
        type: "shipping",
        severity: daysOverdue > 3 ? "critical" : "warning",
        message: `Shipped ${daysOverdue.toFixed(1)} days beyond ${config.maxShippingDays} day shipping SLA`,
        deadline: new Date(shippingDeadline).toISOString(),
        elapsed: formatDuration(now - shippedAt),
        hoursOverdue: daysOverdue * 24,
      });
    }
  }

  const overallStatus = breaches.some((b) => b.severity === "critical")
    ? "breached"
    : breaches.length > 0
    ? "warning"
    : "ok";

  let nextDeadline: string | null = null;
  if (order.status === "pending") {
    nextDeadline = new Date(processingDeadline).toISOString();
  } else if (order.status === "in_progress") {
    nextDeadline = new Date(fulfillmentDeadline).toISOString();
  }

  return {
    orderId: order.id,
    breaches,
    overallStatus,
    nextDeadline,
  };
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function batchCheckSLA(
  orders: FulfillmentOrder[],
  config: SLAConfig = DEFAULT_SLA_CONFIG
): {
  results: SLACheckResult[];
  summary: {
    total: number;
    ok: number;
    warning: number;
    breached: number;
  };
} {
  const results = orders.map((order) => checkSLA(order, config));
  const summary = {
    total: results.length,
    ok: results.filter((r) => r.overallStatus === "ok").length,
    warning: results.filter((r) => r.overallStatus === "warning").length,
    breached: results.filter((r) => r.overallStatus === "breached").length,
  };

  return { results, summary };
}

export function getSLAPriority(
  order: FulfillmentOrder,
  config: SLAConfig = DEFAULT_SLA_CONFIG
): number {
  const check = checkSLA(order, config);
  if (check.overallStatus === "breached") return 100;
  if (check.overallStatus === "warning") return 75;

  const now = Date.now();
  const createdAt = new Date(order.createdAt).getTime();
  const ageHours = (now - createdAt) / (60 * 60 * 1000);
  const processingBudget = config.maxProcessingHours;

  const remainingRatio = Math.max(0, 1 - ageHours / processingBudget);
  return Math.round(remainingRatio * 50);
}

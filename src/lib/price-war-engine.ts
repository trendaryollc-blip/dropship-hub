import type { PriceRule, CompetitorPrice, PriceAdjustmentLog, PriceAdjustmentStrategy, CompetitorAlert } from "@/types/price-war";

export interface PriceCheckResult {
  ruleId: string;
  productTitle: string;
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
  strategy: PriceAdjustmentStrategy;
  competitorPrice?: number;
  marginBefore: number;
  marginAfter: number;
  shouldAdjust: boolean;
  alerts: CompetitorAlert[];
}

export interface PriceWarConfig {
  maxDailyAdjustments: number;
  defaultMinMargin: number;
  priceChangeCooldownMinutes: number;
}

const DEFAULT_CONFIG: PriceWarConfig = {
  maxDailyAdjustments: 50,
  defaultMinMargin: 10,
  priceChangeCooldownMinutes: 60,
};

export function calculateMargin(price: number, cost: number): number {
  if (price <= 0) return 0;
  return Math.round(((price - cost) / price) * 100 * 100) / 100;
}

export function calculateLandedPrice(price: number, shipping: number): number {
  return Math.round((price + shipping) * 100) / 100;
}

export function evaluatePriceRule(
  rule: PriceRule,
  competitorPrices: CompetitorPrice[],
  _config: PriceWarConfig = DEFAULT_CONFIG
): PriceCheckResult {
  const alerts: CompetitorAlert[] = [];
  const inStockCompetitors = competitorPrices.filter((c) => c.inStock && c.totalLanded > 0);
  const lowestCompetitor = inStockCompetitors.length > 0
    ? inStockCompetitors.reduce((min, c) => c.totalLanded < min.totalLanded ? c : min)
    : null;

  const marginBefore = calculateMargin(rule.myPrice, rule.cost);
  let suggestedPrice = rule.myPrice;
  let reason = "No adjustment needed";
  let shouldAdjust = false;

  switch (rule.strategy) {
    case "match_lowest": {
      if (lowestCompetitor) {
        const target = lowestCompetitor.totalLanded;
        if (target < rule.floorPrice) {
          suggestedPrice = rule.floorPrice;
          reason = `Lowest competitor ($${target}) is below floor price ($${rule.floorPrice}), using floor`;
          alerts.push(createAlert(rule.id, rule.productTitle, "below_floor", `Competitor at $${target} is below your floor price of $${rule.floorPrice}`, rule.myPrice, target, "high"));
        } else {
          suggestedPrice = target;
          reason = `Matching lowest competitor price: $${target}`;
        }
        shouldAdjust = suggestedPrice !== rule.myPrice && suggestedPrice >= rule.floorPrice;
      } else {
        reason = "No in-stock competitors found";
      }
      break;
    }
    case "stay_below": {
      const belowPercent = rule.strategyConfig.belowPercent || 5;
      if (lowestCompetitor) {
        const target = Math.round(lowestCompetitor.totalLanded * (1 - belowPercent / 100) * 100) / 100;
        if (target < rule.floorPrice) {
          suggestedPrice = rule.floorPrice;
          reason = `Calculated price ($${target}) is below floor ($${rule.floorPrice}), using floor`;
        } else {
          suggestedPrice = target;
          reason = `Staying ${belowPercent}% below lowest competitor ($${lowestCompetitor.totalLanded})`;
        }
        shouldAdjust = suggestedPrice !== rule.myPrice && suggestedPrice >= rule.floorPrice;
      } else {
        reason = "No in-stock competitors found";
      }
      break;
    }
    case "maintain_margin": {
      const targetMargin = rule.strategyConfig.targetMargin || rule.minMargin;
      const minPrice = Math.round((rule.cost / (1 - targetMargin / 100)) * 100) / 100;
      if (lowestCompetitor && lowestCompetitor.totalLanded > minPrice) {
        suggestedPrice = Math.round(lowestCompetitor.totalLanded * 0.99 * 100) / 100;
        reason = `Maintaining ${targetMargin}% margin while staying competitive`;
      } else {
        suggestedPrice = minPrice;
        reason = `Setting price to maintain ${targetMargin}% minimum margin`;
      }
      if (suggestedPrice < rule.floorPrice) {
        suggestedPrice = rule.floorPrice;
        reason = `Adjusted to floor price ($${rule.floorPrice}) to prevent loss`;
      }
      shouldAdjust = suggestedPrice !== rule.myPrice;
      break;
    }
    case "undercut_percent": {
      const undercut = rule.strategyConfig.undercutPercent || 3;
      if (lowestCompetitor) {
        const target = Math.round(lowestCompetitor.totalLanded * (1 - undercut / 100) * 100) / 100;
        if (target < rule.floorPrice) {
          suggestedPrice = rule.floorPrice;
          reason = `Undercut price ($${target}) below floor ($${rule.floorPrice}), using floor`;
        } else {
          suggestedPrice = target;
          reason = `Undercutting lowest competitor by ${undercut}%`;
        }
        shouldAdjust = suggestedPrice !== rule.myPrice && suggestedPrice >= rule.floorPrice;
      } else {
        reason = "No in-stock competitors found";
      }
      break;
    }
    case "fixed": {
      suggestedPrice = rule.myPrice;
      reason = "Fixed price - no automatic adjustments";
      shouldAdjust = false;
      break;
    }
  }

  if (shouldAdjust) {
    if (rule.strategyConfig.maxIncrease) {
      const maxIncreasePrice = rule.myPrice * (1 + rule.strategyConfig.maxIncrease / 100);
      if (suggestedPrice > maxIncreasePrice) {
        suggestedPrice = maxIncreasePrice;
        reason += ` (capped at ${rule.strategyConfig.maxIncrease}% increase)`;
      }
    }
    if (rule.strategyConfig.maxDecrease) {
      const maxDecreasePrice = rule.myPrice * (1 - rule.strategyConfig.maxDecrease / 100);
      if (suggestedPrice < maxDecreasePrice) {
        suggestedPrice = maxDecreasePrice;
        reason += ` (capped at ${rule.strategyConfig.maxDecrease}% decrease)`;
      }
    }
  }

  const marginAfter = calculateMargin(suggestedPrice, rule.cost);

  for (const comp of inStockCompetitors) {
    if (comp.previousPrice && comp.price < comp.previousPrice) {
      alerts.push(createAlert(rule.id, rule.productTitle, "price_drop", `Competitor ${comp.seller} dropped price from $${comp.previousPrice} to $${comp.price}`, rule.myPrice, comp.price, "medium"));
    }
    if (comp.previousPrice && comp.price > comp.previousPrice) {
      alerts.push(createAlert(rule.id, rule.productTitle, "price_increase", `Competitor ${comp.seller} increased price from $${comp.previousPrice} to $${comp.price}`, rule.myPrice, comp.price, "low"));
    }
  }

  return {
    ruleId: rule.id,
    productTitle: rule.productTitle,
    currentPrice: rule.myPrice,
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    reason,
    strategy: rule.strategy,
    competitorPrice: lowestCompetitor?.totalLanded,
    marginBefore,
    marginAfter,
    shouldAdjust,
    alerts,
  };
}

function createAlert(
  ruleId: string,
  productTitle: string,
  type: CompetitorAlert["type"],
  message: string,
  myPrice: number,
  competitorPrice: number,
  severity: CompetitorAlert["severity"]
): CompetitorAlert {
  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ruleId,
    type,
    message,
    competitorPrice,
    myPrice,
    severity,
    createdAt: new Date().toISOString(),
  };
}

export function shouldCheckRule(rule: PriceRule, now: Date = new Date()): boolean {
  if (rule.status === "paused" || rule.status === "error") return false;
  if (!rule.lastChecked) return true;
  const lastChecked = new Date(rule.lastChecked);
  const diffMinutes = (now.getTime() - lastChecked.getTime()) / (1000 * 60);
  return diffMinutes >= 30;
}

export function calculateFloorPrice(cost: number, minMargin: number): number {
  if (minMargin >= 100) return Infinity;
  return Math.round((cost / (1 - minMargin / 100)) * 100) / 100;
}

export function validatePriceRule(rule: Partial<PriceRule>): string[] {
  const errors: string[] = [];
  if (!rule.productTitle) errors.push("Product title is required");
  if (rule.myPrice === undefined || rule.myPrice < 0) errors.push("Valid price is required");
  if (rule.cost === undefined || rule.cost < 0) errors.push("Valid cost is required");
  if (rule.floorPrice === undefined || rule.floorPrice < 0) errors.push("Valid floor price is required");
  if (rule.minMargin !== undefined && (rule.minMargin < 0 || rule.minMargin > 100)) errors.push("Min margin must be 0-100");
  if (rule.floorPrice !== undefined && rule.cost !== undefined && rule.floorPrice < rule.cost) {
    errors.push("Floor price is below cost - you will lose money");
  }
  if (!rule.strategy) errors.push("Strategy is required");
  if (!rule.platforms || rule.platforms.length === 0) errors.push("At least one platform is required");
  return errors;
}

export function calculateDailyAdjustmentCount(adjustments: PriceAdjustmentLog[], date: string = new Date().toISOString().split("T")[0]): number {
  return adjustments.filter((a) => a.createdAt.startsWith(date)).length;
}

export function getMarginStatus(margin: number): "critical" | "warning" | "healthy" | "excellent" {
  if (margin < 5) return "critical";
  if (margin < 15) return "warning";
  if (margin < 40) return "healthy";
  return "excellent";
}

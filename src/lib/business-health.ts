import type {
  HealthScoreResult,
  HealthCategoryScore,
  HealthCategory,
  HealthGrade,
  HealthFactor,
  HealthAlert,
  HealthRecommendation,
} from "@/types/business-health";

// ── Grade Calculator ─────────────────────────────────────────────────────────

function scoreToGrade(score: number): HealthGrade {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 60) return "D";
  return "F";
}

function factorStatus(value: number, goodThreshold: number, warningThreshold: number): "good" | "warning" | "critical" {
  if (value >= goodThreshold) return "good";
  if (value >= warningThreshold) return "warning";
  return "critical";
}

// ── Financial Health ─────────────────────────────────────────────────────────

function calculateFinancialHealth(data: {
  profitMargin?: number;
  revenueGrowth?: number;
  cashReserveDays?: number;
  adSpendRatio?: number;
  refundRate?: number;
}): HealthCategoryScore {
  const factors: HealthFactor[] = [];
  let totalScore = 0;
  let factorCount = 0;

  // Profit margin (0-100 scale)
  if (data.profitMargin !== undefined) {
    const score = Math.min(100, Math.max(0, data.profitMargin * 5)); // 20% = 100
    factors.push({
      name: "Profit Margin",
      value: data.profitMargin,
      unit: "%",
      status: factorStatus(data.profitMargin, 15, 5),
      impact: "high",
      description: data.profitMargin >= 15 ? "Healthy margins" : data.profitMargin >= 5 ? "Low margins — optimize costs" : "Critical: margins too thin",
    });
    totalScore += score;
    factorCount++;
  }

  // Revenue growth
  if (data.revenueGrowth !== undefined) {
    const score = Math.min(100, Math.max(0, 50 + data.revenueGrowth * 2));
    factors.push({
      name: "Revenue Growth",
      value: data.revenueGrowth,
      unit: "%",
      status: factorStatus(data.revenueGrowth, 10, 0),
      impact: "high",
      description: data.revenueGrowth >= 10 ? "Growing revenue" : data.revenueGrowth >= 0 ? "Flat revenue — find new products" : "Revenue declining — urgent action needed",
    });
    totalScore += score;
    factorCount++;
  }

  // Cash reserve
  if (data.cashReserveDays !== undefined) {
    const score = Math.min(100, data.cashReserveDays * 3.33); // 30 days = 100
    factors.push({
      name: "Cash Reserve",
      value: data.cashReserveDays,
      unit: "days",
      status: factorStatus(data.cashReserveDays, 14, 7),
      impact: "high",
      description: data.cashReserveDays >= 14 ? "Healthy cash reserves" : data.cashReserveDays >= 7 ? "Low cash — monitor closely" : "Critical: cash running low",
    });
    totalScore += score;
    factorCount++;
  }

  // Ad spend ratio
  if (data.adSpendRatio !== undefined) {
    const score = data.adSpendRatio <= 20 ? 100 : data.adSpendRatio <= 30 ? 70 : data.adSpendRatio <= 40 ? 40 : 10;
    factors.push({
      name: "Ad Spend Ratio",
      value: data.adSpendRatio,
      unit: "% of revenue",
      status: data.adSpendRatio <= 20 ? "good" : data.adSpendRatio <= 30 ? "warning" : "critical",
      impact: "medium",
      description: data.adSpendRatio <= 20 ? "Efficient ad spend" : data.adSpendRatio <= 30 ? "Ad spend getting high" : "Ad spend excessive — optimize campaigns",
    });
    totalScore += score;
    factorCount++;
  }

  // Refund rate
  if (data.refundRate !== undefined) {
    const score = data.refundRate <= 2 ? 100 : data.refundRate <= 5 ? 70 : data.refundRate <= 10 ? 40 : 10;
    factors.push({
      name: "Refund Rate",
      value: data.refundRate,
      unit: "%",
      status: data.refundRate <= 2 ? "good" : data.refundRate <= 5 ? "warning" : "critical",
      impact: "medium",
      description: data.refundRate <= 2 ? "Low refund rate" : data.refundRate <= 5 ? "Moderate refunds — check quality" : "High refunds — supplier/product issue",
    });
    totalScore += score;
    factorCount++;
  }

  const avgScore = factorCount > 0 ? Math.round(totalScore / factorCount) : 50;

  return {
    category: "financial",
    label: "Financial Health",
    score: avgScore,
    weight: 25,
    grade: scoreToGrade(avgScore),
    factors,
    trend: "stable",
  };
}

// ── Operations Health ────────────────────────────────────────────────────────

function calculateOperationsHealth(data: {
  fulfillmentRate?: number;
  avgShippingDays?: number;
  orderAccuracy?: number;
  activeProducts?: number;
  monitoringActive?: boolean;
}): HealthCategoryScore {
  const factors: HealthFactor[] = [];
  let totalScore = 0;
  let factorCount = 0;

  if (data.fulfillmentRate !== undefined) {
    const score = Math.min(100, data.fulfillmentRate);
    factors.push({
      name: "Fulfillment Rate",
      value: data.fulfillmentRate,
      unit: "%",
      status: factorStatus(data.fulfillmentRate, 95, 85),
      impact: "high",
      description: data.fulfillmentRate >= 95 ? "Excellent fulfillment" : data.fulfillmentRate >= 85 ? "Some fulfillment issues" : "Fulfillment problems — check suppliers",
    });
    totalScore += score;
    factorCount++;
  }

  if (data.avgShippingDays !== undefined) {
    const score = data.avgShippingDays <= 7 ? 100 : data.avgShippingDays <= 14 ? 70 : data.avgShippingDays <= 21 ? 40 : 10;
    factors.push({
      name: "Avg Shipping Time",
      value: data.avgShippingDays,
      unit: "days",
      status: data.avgShippingDays <= 7 ? "good" : data.avgShippingDays <= 14 ? "warning" : "critical",
      impact: "high",
      description: data.avgShippingDays <= 7 ? "Fast shipping" : data.avgShippingDays <= 14 ? "Moderate shipping times" : "Slow shipping — customers unhappy",
    });
    totalScore += score;
    factorCount++;
  }

  if (data.orderAccuracy !== undefined) {
    const score = Math.min(100, data.orderAccuracy);
    factors.push({
      name: "Order Accuracy",
      value: data.orderAccuracy,
      unit: "%",
      status: factorStatus(data.orderAccuracy, 98, 95),
      impact: "medium",
      description: data.orderAccuracy >= 98 ? "High accuracy" : data.orderAccuracy >= 95 ? "Minor accuracy issues" : "Accuracy problems — review process",
    });
    totalScore += score;
    factorCount++;
  }

  if (data.activeProducts !== undefined) {
    const score = data.activeProducts >= 10 ? 100 : data.activeProducts >= 5 ? 70 : data.activeProducts >= 1 ? 40 : 0;
    factors.push({
      name: "Active Products",
      value: data.activeProducts,
      unit: "products",
      status: data.activeProducts >= 10 ? "good" : data.activeProducts >= 5 ? "warning" : "critical",
      impact: "low",
      description: data.activeProducts >= 10 ? "Good product variety" : data.activeProducts >= 5 ? "Limited products" : "Need more products",
    });
    totalScore += score;
    factorCount++;
  }

  const avgScore = factorCount > 0 ? Math.round(totalScore / factorCount) : 50;

  return {
    category: "operations",
    label: "Operations",
    score: avgScore,
    weight: 20,
    grade: scoreToGrade(avgScore),
    factors,
    trend: "stable",
  };
}

// ── Supplier Health ──────────────────────────────────────────────────────────

function calculateSupplierHealth(data: {
  avgSupplierScore?: number;
  activeSuppliers?: number;
  supplierIssues?: number;
  autoSwitchActive?: boolean;
}): HealthCategoryScore {
  const factors: HealthFactor[] = [];
  let totalScore = 0;
  let factorCount = 0;

  if (data.avgSupplierScore !== undefined) {
    const score = Math.min(100, data.avgSupplierScore);
    factors.push({
      name: "Avg Supplier Score",
      value: data.avgSupplierScore,
      unit: "/100",
      status: factorStatus(data.avgSupplierScore, 80, 60),
      impact: "high",
      description: data.avgSupplierScore >= 80 ? "Strong supplier relationships" : data.avgSupplierScore >= 60 ? "Some supplier concerns" : "Weak suppliers — find alternatives",
    });
    totalScore += score;
    factorCount++;
  }

  if (data.activeSuppliers !== undefined) {
    const score = data.activeSuppliers >= 3 ? 100 : data.activeSuppliers >= 2 ? 70 : data.activeSuppliers >= 1 ? 40 : 0;
    factors.push({
      name: "Active Suppliers",
      value: data.activeSuppliers,
      unit: "suppliers",
      status: data.activeSuppliers >= 3 ? "good" : data.activeSuppliers >= 2 ? "warning" : "critical",
      impact: "medium",
      description: data.activeSuppliers >= 3 ? "Good supplier diversity" : data.activeSuppliers >= 2 ? "Consider adding more suppliers" : "Single supplier risk",
    });
    totalScore += score;
    factorCount++;
  }

  if (data.supplierIssues !== undefined) {
    const score = data.supplierIssues === 0 ? 100 : data.supplierIssues <= 2 ? 70 : 30;
    factors.push({
      name: "Supplier Issues",
      value: data.supplierIssues,
      unit: "issues",
      status: data.supplierIssues === 0 ? "good" : data.supplierIssues <= 2 ? "warning" : "critical",
      impact: "high",
      description: data.supplierIssues === 0 ? "No supplier issues" : `${data.supplierIssues} active issue(s) — resolve quickly`,
    });
    totalScore += score;
    factorCount++;
  }

  const avgScore = factorCount > 0 ? Math.round(totalScore / factorCount) : 50;

  return {
    category: "supplier",
    label: "Supplier Health",
    score: avgScore,
    weight: 20,
    grade: scoreToGrade(avgScore),
    factors,
    trend: "stable",
  };
}

// ── Product Health ───────────────────────────────────────────────────────────

function calculateProductHealth(data: {
  totalProducts?: number;
  winningProducts?: number;
  avgProductScore?: number;
  productsInCompliance?: number;
}): HealthCategoryScore {
  const factors: HealthFactor[] = [];
  let totalScore = 0;
  let factorCount = 0;

  if (data.totalProducts !== undefined && data.winningProducts !== undefined) {
    const ratio = data.totalProducts > 0 ? (data.winningProducts / data.totalProducts) * 100 : 0;
    const score = Math.min(100, ratio * 2);
    factors.push({
      name: "Winning Product Rate",
      value: Math.round(ratio),
      unit: "%",
      status: ratio >= 20 ? "good" : ratio >= 10 ? "warning" : "critical",
      impact: "high",
      description: ratio >= 20 ? "Good win rate" : ratio >= 10 ? "Moderate win rate" : "Low win rate — improve product selection",
    });
    totalScore += score;
    factorCount++;
  }

  if (data.avgProductScore !== undefined) {
    factors.push({
      name: "Avg Product Score",
      value: data.avgProductScore,
      unit: "/100",
      status: factorStatus(data.avgProductScore, 70, 50),
      impact: "medium",
      description: data.avgProductScore >= 70 ? "Strong product portfolio" : "Portfolio needs improvement",
    });
    totalScore += data.avgProductScore;
    factorCount++;
  }

  if (data.productsInCompliance !== undefined && data.totalProducts !== undefined) {
    const rate = data.totalProducts > 0 ? (data.productsInCompliance / data.totalProducts) * 100 : 100;
    factors.push({
      name: "Compliance Rate",
      value: Math.round(rate),
      unit: "%",
      status: rate >= 95 ? "good" : rate >= 80 ? "warning" : "critical",
      impact: "high",
      description: rate >= 95 ? "All products compliant" : `${Math.round(100 - rate)}% non-compliant — fix immediately`,
    });
    totalScore += rate;
    factorCount++;
  }

  const avgScore = factorCount > 0 ? Math.round(totalScore / factorCount) : 50;

  return {
    category: "product",
    label: "Product Health",
    score: avgScore,
    weight: 15,
    grade: scoreToGrade(avgScore),
    factors,
    trend: "stable",
  };
}

// ── Main Health Score Calculator ─────────────────────────────────────────────

export function calculateBusinessHealth(data: {
  financial?: { profitMargin?: number; revenueGrowth?: number; cashReserveDays?: number; adSpendRatio?: number; refundRate?: number };
  operations?: { fulfillmentRate?: number; avgShippingDays?: number; orderAccuracy?: number; activeProducts?: number; monitoringActive?: boolean };
  supplier?: { avgSupplierScore?: number; activeSuppliers?: number; supplierIssues?: number; autoSwitchActive?: boolean };
  product?: { totalProducts?: number; winningProducts?: number; avgProductScore?: number; productsInCompliance?: number };
}): HealthScoreResult {
  const categories: HealthCategoryScore[] = [];

  if (data.financial) categories.push(calculateFinancialHealth(data.financial));
  if (data.operations) categories.push(calculateOperationsHealth(data.operations));
  if (data.supplier) categories.push(calculateSupplierHealth(data.supplier));
  if (data.product) categories.push(calculateProductHealth(data.product));

  // Calculate weighted overall score
  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);
  const overallScore = totalWeight > 0
    ? Math.round(categories.reduce((sum, c) => sum + c.score * (c.weight / totalWeight), 0))
    : 50;

  // Generate alerts
  const alerts: HealthAlert[] = [];
  categories.forEach((cat) => {
    cat.factors.forEach((factor) => {
      if (factor.status === "critical") {
        alerts.push({
          id: `${cat.category}-${factor.name}`,
          category: cat.category,
          severity: "critical",
          title: `${factor.name} is critical`,
          description: factor.description,
          action: `Address ${factor.name.toLowerCase()} immediately`,
          createdAt: new Date().toISOString(),
        });
      }
    });
    if (cat.score < 40) {
      alerts.push({
        id: `${cat.category}-low-score`,
        category: cat.category,
        severity: "warning",
        title: `${cat.label} score is low`,
        description: `${cat.label} scored ${cat.score}/100 (${cat.grade})`,
        action: `Review ${cat.label.toLowerCase()} factors and take corrective action`,
        createdAt: new Date().toISOString(),
      });
    }
  });

  // Generate recommendations
  const recommendations: HealthRecommendation[] = [];
  categories.forEach((cat) => {
    if (cat.score < 70) {
      recommendations.push({
        category: cat.category,
        priority: cat.score < 40 ? "high" : "medium",
        title: `Improve ${cat.label}`,
        description: `Current score: ${cat.score}/100. Focus on critical factors.`,
        expectedImpact: `+${Math.min(30, 100 - cat.score)} points if addressed`,
        effort: cat.score < 40 ? "high" : "medium",
      });
    }
  });

  return {
    overallScore,
    grade: scoreToGrade(overallScore),
    categories,
    alerts,
    recommendations,
    calculatedAt: new Date().toISOString(),
  };
}

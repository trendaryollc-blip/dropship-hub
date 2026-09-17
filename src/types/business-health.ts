import { Timestamp } from "firebase/firestore";

// ── Business Health Score ────────────────────────────────────────────────────

export type HealthCategory =
  | "financial"
  | "operations"
  | "supplier"
  | "product"
  | "customer"
  | "compliance"
  | "growth";

export type HealthGrade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F";

export interface HealthScoreResult {
  overallScore: number; // 0-100
  grade: HealthGrade;
  categories: HealthCategoryScore[];
  alerts: HealthAlert[];
  recommendations: HealthRecommendation[];
  calculatedAt: string;
}

export interface HealthCategoryScore {
  category: HealthCategory;
  label: string;
  score: number; // 0-100
  weight: number; // percentage weight in overall
  grade: HealthGrade;
  factors: HealthFactor[];
  trend: "improving" | "stable" | "declining";
  previousScore?: number;
}

export interface HealthFactor {
  name: string;
  value: number;
  unit: string;
  status: "good" | "warning" | "critical";
  impact: "high" | "medium" | "low";
  description: string;
}

export interface HealthAlert {
  id: string;
  category: HealthCategory;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  action: string;
  createdAt: string;
}

export interface HealthRecommendation {
  category: HealthCategory;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  expectedImpact: string;
  effort: "low" | "medium" | "high";
}

export interface HealthSnapshot {
  id: string;
  overallScore: number;
  grade: HealthGrade;
  categoryScores: Record<HealthCategory, number>;
  calculatedAt: string;
  createdAt: Timestamp;
}

// ── Audit Trail ──────────────────────────────────────────────────────────────

export type AuditAction =
  | "product.listed"
  | "product.removed"
  | "product.updated"
  | "order.created"
  | "order.fulfilled"
  | "order.cancelled"
  | "order.refunded"
  | "supplier.added"
  | "supplier.removed"
  | "supplier.rated"
  | "store.connected"
  | "store.disconnected"
  | "settings.updated"
  | "campaign.created"
  | "campaign.paused"
  | "compliance.checked"
  | "compliance.flagged"
  | "export.generated"
  | "alert.created"
  | "user.login"
  | "user.logout";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  entityType: "product" | "order" | "supplier" | "store" | "settings" | "campaign" | "compliance" | "user" | "system";
  entityId?: string;
  entityName?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
}

export interface AuditFilter {
  action?: AuditAction;
  entityType?: string;
  severity?: "info" | "warning" | "critical";
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface AuditStats {
  totalEvents: number;
  todayEvents: number;
  criticalEvents: number;
  topActions: { action: string; count: number }[];
  activityTimeline: { date: string; count: number }[];
}

// ── Supplier Terms Tracker ──────────────────────────────────────────────────

export interface SupplierTerms {
  id: string;
  supplierId: string;
  supplierName: string;
  paymentTerms: PaymentTerms;
  returnPolicy: ReturnPolicy;
  shippingTerms: ShippingTerms;
  slaTerms: SLATerms;
  contractStart?: string;
  contractEnd?: string;
  lastRenewed?: string;
  notes: string;
  documents: TermsDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTerms {
  method: "prepaid" | "net_15" | "net_30" | "net_45" | "net_60" | "cod" | "escrow";
  discountPercent?: number;
  discountDays?: number;
  lateFeePercent?: number;
  currency: string;
  minimumOrder?: number;
}

export interface ReturnPolicy {
  returnWindowDays: number;
  restockingFeePercent: number;
  returnShippingPaidBy: "buyer" | "seller" | "split";
  conditions: string[];
  defectReplacementDays?: number;
  refundProcessingDays: number;
}

export interface ShippingTerms {
  defaultCarrier: string;
  estimatedDays: { min: number; max: number };
  freeShippingThreshold?: number;
  shippingCostModel: "flat" | "weight_based" | "calculated" | "free";
  trackingIncluded: boolean;
  insuranceIncluded: boolean;
}

export interface SLATerms {
  responseTimeHours: number;
  processingTimeHours: number;
  shippingWindowDays: number;
  qualityAcceptanceRate: number; // minimum %
  penaltyClause?: string;
}

export interface TermsDocument {
  name: string;
  url: string;
  uploadedAt: string;
}

export interface SupplierTermsSummary {
  totalSuppliers: number;
  withContracts: number;
  expiringSoon: number; // within 30 days
  avgPaymentDays: number;
  avgReturnWindow: number;
  complianceRate: number; // % meeting SLA
}

import { z } from "zod";

// ── Return Request ──────────────────────────────────────────────────────────

export type ReturnReason =
  | "defective"
  | "wrong_item"
  | "not_as_described"
  | "changed_mind"
  | "damaged_in_shipping"
  | "size_issue"
  | "quality_issue"
  | "other";

export type ReturnStatus =
  | "pending"
  | "approved"
  | "label_generated"
  | "shipped_back"
  | "received"
  | "inspected"
  | "refunded"
  | "denied"
  | "cancelled";

export interface ReturnLabel {
  trackingNumber: string;
  carrier: string;
  returnAddress: string;
  instructions: string;
  labelUrl: string | null;
  generatedAt: string;
}

export interface ReturnRequestItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: ReturnRequestItem[];
  reason: ReturnReason;
  reasonDetails: string;
  status: ReturnStatus;
  returnLabel: ReturnLabel | null;
  refundAmount: number;
  supplierId: string;
  supplierName: string;
  platform: string;
  storePlatform: string;
  createdAt: string;
  updatedAt: string;
}

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  defective: "Defective Product",
  wrong_item: "Wrong Item Received",
  not_as_described: "Not As Described",
  changed_mind: "Changed Mind",
  damaged_in_shipping: "Damaged In Shipping",
  size_issue: "Size Issue",
  quality_issue: "Quality Issue",
  other: "Other",
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  label_generated: "Label Generated",
  shipped_back: "Shipped Back",
  received: "Received",
  inspected: "Inspected",
  refunded: "Refunded",
  denied: "Denied",
  cancelled: "Cancelled",
};

export const RETURN_STATUS_COLORS: Record<ReturnStatus, string> = {
  pending: "text-yellow-400 bg-yellow-400/10",
  approved: "text-blue-400 bg-blue-400/10",
  label_generated: "text-purple-400 bg-purple-400/10",
  shipped_back: "text-indigo-400 bg-indigo-400/10",
  received: "text-cyan-400 bg-cyan-400/10",
  inspected: "text-orange-400 bg-orange-400/10",
  refunded: "text-green-400 bg-green-400/10",
  denied: "text-red-400 bg-red-400/10",
  cancelled: "text-gray-400 bg-gray-400/10",
};

// ── Refund Calculation ──────────────────────────────────────────────────────

export type RefundMethod = "original" | "partial" | "store_credit";

export interface SupplierRefundPolicy {
  type: "full_refund" | "partial_refund" | "store_credit_only" | "no_refund";
  restockingFeePercent: number;
  refundWindowDays: number;
  returnShippingPaidBy: "buyer" | "seller";
}

export interface RefundCalculation {
  id: string;
  returnRequestId: string;
  orderId: string;
  subtotal: number;
  shippingCost: number;
  platformFees: number;
  supplierRefundAmount: number;
  totalRefund: number;
  refundMethod: RefundMethod;
  supplierPolicy: SupplierRefundPolicy;
  processed: boolean;
  processedAt: string | null;
  createdAt: string;
}

export const DEFAULT_SUPPLIER_REFUND_POLICY: SupplierRefundPolicy = {
  type: "full_refund",
  restockingFeePercent: 0,
  refundWindowDays: 30,
  returnShippingPaidBy: "seller",
};

export const REFUND_METHOD_LABELS: Record<RefundMethod, string> = {
  original: "Original Payment",
  partial: "Partial Refund",
  store_credit: "Store Credit",
};

// ── Defect Report ───────────────────────────────────────────────────────────

export type DefectType =
  | "broken"
  | "malfunction"
  | "cosmetic_damage"
  | "missing_parts"
  | "wrong_specification"
  | "packaging_damage"
  | "electrical_issue"
  | "other";

export type DefectSeverity = "low" | "medium" | "high" | "critical";

export type DefectReportedBy = "customer" | "quality_check" | "auto_detected";

export type DefectResolution =
  | "pending"
  | "replacement_sent"
  | "refund_issued"
  | "supplier_claimed"
  | "dismissed"
  | "escalated";

export interface DefectReport {
  id: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  orderId: string;
  defectType: DefectType;
  description: string;
  severity: DefectSeverity;
  reportedBy: DefectReportedBy;
  resolution: DefectResolution;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export const DEFECT_TYPE_LABELS: Record<DefectType, string> = {
  broken: "Broken",
  malfunction: "Malfunction",
  cosmetic_damage: "Cosmetic Damage",
  missing_parts: "Missing Parts",
  wrong_specification: "Wrong Specification",
  packaging_damage: "Packaging Damage",
  electrical_issue: "Electrical Issue",
  other: "Other",
};

export const DEFECT_SEVERITY_LABELS: Record<DefectSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const DEFECT_SEVERITY_COLORS: Record<DefectSeverity, string> = {
  low: "text-gray-400 bg-gray-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  high: "text-orange-400 bg-orange-400/10",
  critical: "text-red-400 bg-red-400/10",
};

export const DEFECT_RESOLUTION_LABELS: Record<DefectResolution, string> = {
  pending: "Pending",
  replacement_sent: "Replacement Sent",
  refund_issued: "Refund Issued",
  supplier_claimed: "Supplier Claimed",
  dismissed: "Dismissed",
  escalated: "Escalated",
};

// ── Defect Analytics ────────────────────────────────────────────────────────

export type TrendDirection = "rising" | "falling" | "stable";

export interface SupplierDefectSummary {
  supplierId: string;
  supplierName: string;
  totalDefects: number;
  defectRate: number;
  avgResolutionDays: number;
  topDefectTypes: { type: DefectType; count: number }[];
  severity: DefectSeverity;
  products: { productId: string; productName: string; defectCount: number }[];
  trend: TrendDirection;
  period: string;
}

export interface DefectAnalytics {
  suppliers: SupplierDefectSummary[];
  totalDefects: number;
  overallDefectRate: number;
  topDefectProducts: { productId: string; productName: string; defectCount: number; supplierName: string }[];
  severityBreakdown: Record<DefectSeverity, number>;
  period: string;
}

// ── Return Settings ─────────────────────────────────────────────────────────

export interface ReturnSettings {
  autoDetectReturns: boolean;
  detectIntervalMinutes: number;
  autoGenerateLabels: boolean;
  defaultRefundMethod: RefundMethod;
  notifyCustomer: boolean;
  restockingFeePercent: number;
  returnWindowDays: number;
}

export const DEFAULT_RETURN_SETTINGS: ReturnSettings = {
  autoDetectReturns: true,
  detectIntervalMinutes: 60,
  autoGenerateLabels: true,
  defaultRefundMethod: "original",
  notifyCustomer: true,
  restockingFeePercent: 0,
  returnWindowDays: 30,
};

// ── Return Stats ────────────────────────────────────────────────────────────

export interface ReturnStats {
  pendingReturns: number;
  processedToday: number;
  totalRefunds: number;
  avgReturnRate: number;
  topReasons: { reason: ReturnReason; count: number }[];
  refundByPlatform: { platform: string; amount: number; count: number }[];
}

// ── Zod Schemas ─────────────────────────────────────────────────────────────

export const ReturnRequestItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  imageUrl: z.string(),
});

export const ReturnLabelSchema = z.object({
  trackingNumber: z.string(),
  carrier: z.string(),
  returnAddress: z.string(),
  instructions: z.string(),
  labelUrl: z.string().nullable(),
  generatedAt: z.string(),
});

export const ReturnRequestSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderNumber: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  items: z.array(ReturnRequestItemSchema),
  reason: z.enum([
    "defective", "wrong_item", "not_as_described", "changed_mind",
    "damaged_in_shipping", "size_issue", "quality_issue", "other",
  ]),
  reasonDetails: z.string(),
  status: z.enum([
    "pending", "approved", "label_generated", "shipped_back",
    "received", "inspected", "refunded", "denied", "cancelled",
  ]),
  returnLabel: ReturnLabelSchema.nullable(),
  refundAmount: z.number().min(0),
  supplierId: z.string(),
  supplierName: z.string(),
  platform: z.string(),
  storePlatform: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SupplierRefundPolicySchema = z.object({
  type: z.enum(["full_refund", "partial_refund", "store_credit_only", "no_refund"]),
  restockingFeePercent: z.number().min(0).max(100),
  refundWindowDays: z.number().int().min(1),
  returnShippingPaidBy: z.enum(["buyer", "seller"]),
});

export const RefundCalculationSchema = z.object({
  id: z.string(),
  returnRequestId: z.string(),
  orderId: z.string(),
  subtotal: z.number().min(0),
  shippingCost: z.number().min(0),
  platformFees: z.number().min(0),
  supplierRefundAmount: z.number().min(0),
  totalRefund: z.number().min(0),
  refundMethod: z.enum(["original", "partial", "store_credit"]),
  supplierPolicy: SupplierRefundPolicySchema,
  processed: z.boolean(),
  processedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const DefectReportSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  supplierId: z.string(),
  supplierName: z.string(),
  orderId: z.string(),
  defectType: z.enum([
    "broken", "malfunction", "cosmetic_damage", "missing_parts",
    "wrong_specification", "packaging_damage", "electrical_issue", "other",
  ]),
  description: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  reportedBy: z.enum(["customer", "quality_check", "auto_detected"]),
  resolution: z.enum([
    "pending", "replacement_sent", "refund_issued",
    "supplier_claimed", "dismissed", "escalated",
  ]),
  resolved: z.boolean(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const ReturnSettingsSchema = z.object({
  autoDetectReturns: z.boolean(),
  detectIntervalMinutes: z.number().int().min(5).max(1440),
  autoGenerateLabels: z.boolean(),
  defaultRefundMethod: z.enum(["original", "partial", "store_credit"]),
  notifyCustomer: z.boolean(),
  restockingFeePercent: z.number().min(0).max(100),
  returnWindowDays: z.number().int().min(1).max(365),
});

// ── Input Schemas ───────────────────────────────────────────────────────────

export const AddReturnRequestInputSchema = z.object({
  orderId: z.string().min(1).max(200),
  orderNumber: z.string().min(1).max(200),
  customerId: z.string().min(1).max(200),
  customerName: z.string().min(1).max(500),
  customerEmail: z.string().email().max(500),
  items: z.array(ReturnRequestItemSchema).min(1),
  reason: z.enum([
    "defective", "wrong_item", "not_as_described", "changed_mind",
    "damaged_in_shipping", "size_issue", "quality_issue", "other",
  ]),
  reasonDetails: z.string().min(1).max(5000),
  supplierId: z.string().min(1).max(200),
  supplierName: z.string().min(1).max(500),
  platform: z.string().min(1).max(100),
  storePlatform: z.string().min(1).max(100),
});

export const AddRefundCalculationInputSchema = z.object({
  returnRequestId: z.string().min(1).max(200),
  orderId: z.string().min(1).max(200),
  subtotal: z.number().min(0),
  shippingCost: z.number().min(0),
  platformFees: z.number().min(0),
  supplierRefundAmount: z.number().min(0),
  totalRefund: z.number().min(0),
  refundMethod: z.enum(["original", "partial", "store_credit"]),
  supplierPolicy: SupplierRefundPolicySchema,
});

export const AddDefectReportInputSchema = z.object({
  productId: z.string().min(1).max(200),
  productName: z.string().min(1).max(500),
  supplierId: z.string().min(1).max(200),
  supplierName: z.string().min(1).max(500),
  orderId: z.string().min(1).max(200),
  defectType: z.enum([
    "broken", "malfunction", "cosmetic_damage", "missing_parts",
    "wrong_specification", "packaging_damage", "electrical_issue", "other",
  ]),
  description: z.string().min(1).max(5000),
  severity: z.enum(["low", "medium", "high", "critical"]),
  reportedBy: z.enum(["customer", "quality_check", "auto_detected"]),
});

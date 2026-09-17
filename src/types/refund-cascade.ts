import { Timestamp } from "firebase/firestore";

// ── Refund Cascade Types ─────────────────────────────────────────────────────

export type RefundStatus = "initiated" | "supplier_claimed" | "supplier_approved" | "supplier_denied" | "store_refunded" | "payment_refunded" | "completed" | "disputed" | "escalated";
export type RefundReason = "defective" | "wrong_item" | "not_as_described" | "damaged" | "late_delivery" | "customer_changed_mind" | "quality_issue" | "other";
export type DisputeStatus = "none" | "open" | "evidence_submitted" | "under_review" | "resolved" | "won" | "lost";

export interface RefundCascade {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  productTitle: string;
  productImage?: string;
  orderAmount: number;
  refundAmount: number;
  reason: RefundReason;
  reasonDetails: string;
  status: RefundStatus;
  steps: RefundStep[];
  supplierClaim: SupplierClaim;
  storeRefund: StoreRefund;
  paymentRefund: PaymentRefund;
  dispute: DisputeInfo;
  totalRefundCost: number;
  supplierRefundReceived: number;
  netLoss: number;
  timeline: RefundEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface RefundStep {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface SupplierClaim {
  claimId?: string;
  status: "not_submitted" | "submitted" | "approved" | "denied" | "partial";
  amount: number;
  submittedAt?: string;
  resolvedAt?: string;
  evidence: string[];
  response?: string;
}

export interface StoreRefund {
  refundId?: string;
  status: "not_processed" | "processing" | "completed" | "failed";
  amount: number;
  method: "original" | "store_credit" | "partial";
  processedAt?: string;
}

export interface PaymentRefund {
  refundId?: string;
  status: "not_initiated" | "initiated" | "processing" | "completed" | "failed";
  amount: number;
  processor: "stripe" | "paypal" | "manual";
  initiatedAt?: string;
  completedAt?: string;
}

export interface DisputeInfo {
  status: DisputeStatus;
  platform: string;
  caseId?: string;
  openedAt?: string;
  evidenceDeadline?: string;
  resolution?: string;
}

export interface RefundEvent {
  id: string;
  action: string;
  actor: "system" | "customer" | "admin" | "supplier" | "platform";
  details: string;
  timestamp: string;
}

export interface RefundStats {
  totalRefunds: number;
  totalRefundAmount: number;
  supplierRecovery: number;
  netLoss: number;
  avgProcessingDays: number;
  refundRate: number;
  topReasons: { reason: string; count: number }[];
  monthlyTrend: { month: string; count: number; amount: number }[];
}

export interface RefundTemplate {
  id: string;
  name: string;
  reason: RefundReason;
  response: string;
  category: string;
  usageCount: number;
}

// ── Firestore Doc ────────────────────────────────────────────────────────────

export interface RefundCascadeDoc {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  productTitle: string;
  orderAmount: number;
  refundAmount: number;
  reason: string;
  status: string;
  supplierRefundReceived: number;
  netLoss: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
